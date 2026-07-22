# Plano — tool calling confiável para vLLM

## 1. Objetivo

Permitir que agents executados por providers `openai-compat`, especialmente vLLM com Gemma 4,
chamem ferramentas reais do Workestrator sem transformar a chamada em texto, sem repetir o mesmo
agent indefinidamente e sem deixar runs presas em `running`.

O primeiro cenário de aceite é simples e observável:

1. o modelo chama `workspace__write_file`;
2. o runner grava `output/vllm-result.md`;
3. o modelo chama `workspace__read_file`;
4. o modelo chama `workspace__list_files`;
5. o agent retorna `FILE_READY ... verified=true`;
6. o run termina com um arquivo real no manifesto.

## 2. Diagnóstico confirmado

O request do Workestrator já envia `tools` e `tool_choice: "auto"` para `/chat/completions`. No teste,
o modelo respondeu:

```txt
call:workspace__write_file{path: "output/vllm-result.md", content: "..."}
```

Esse conteúdo chegou em `message.content`, e não em `message.tool_calls`. Portanto:

- o modelo entendeu qual ferramenta deveria usar;
- o provider não converteu o protocolo textual do modelo para o contrato OpenAI de tool calling;
- o runner corretamente não executou texto arbitrário;
- o coordenador não recebeu `FILE_READY` e repetiu o agent;
- o run abortado terminou sem arquivos.

Também foi observada uma data inventada (`24/05/2024`). A data atual deve ser injetada no contexto
da execução ou removida do teste; o modelo não deve adivinhá-la.

## 3. De quem é a responsabilidade?

Não é apenas do modelo nem apenas do Workestrator. Tool calling depende de quatro camadas:

| Camada | Responsabilidade |
| --- | --- |
| Modelo | Ter capacidade de escolher ferramentas e produzir seu protocolo de chamada |
| Chat template | Apresentar as ferramentas e formatar chamadas/resultados no protocolo esperado pelo modelo |
| vLLM | Usar o parser correto e devolver `message.tool_calls` no contrato OpenAI-compatible |
| Workestrator | Enviar schemas, executar somente tools autorizadas, validar argumentos e controlar o loop |

O formato correto para a integração principal é:

```json
{
  "choices": [
    {
      "message": {
        "tool_calls": [
          {
            "id": "call_1",
            "type": "function",
            "function": {
              "name": "workspace__write_file",
              "arguments": "{\"path\":\"output/vllm-result.md\",\"content\":\"...\"}"
            }
          }
        ]
      }
    }
  ]
}
```

O texto `call:workspace__write_file{...}` não deve ser considerado o contrato normal. Ele pode ser
aceito somente por um fallback explicitamente habilitado, limitado e auditável.

## 4. Decisão de arquitetura

Adotar duas camadas, nesta ordem:

1. **Tool calling nativo do vLLM**, que é o caminho padrão e recomendado.
2. **Fallback textual seguro no runner**, apenas para modelos locais que entendem ferramentas, mas
   cujo servidor não consegue emitir `tool_calls` estruturados.

O fallback não substitui a configuração correta do vLLM. Ele aumenta compatibilidade e evita que um
modelo local razoável fique inutilizável por diferença de protocolo.

## 5. Fase 1 — corrigir e validar o servidor vLLM

### 5.1 Inventariar a instalação

Registrar antes de mudar:

- versão exata do vLLM;
- repositório/caminho exato do modelo chamado `gemma-4-12b-it`;
- comando, Docker Compose ou serviço usado para iniciar o servidor;
- `tokenizer_config.json` e chat template efetivamente carregado;
- flags atuais de tool calling e reasoning;
- resposta JSON bruta de um request pequeno com uma ferramenta fictícia.

O nome `gemma-4-12b-it` pode ser um alias, quantização ou modelo customizado. Não se deve assumir
compatibilidade apenas pelo nome; ela precisa ser confirmada pelo repositório e tokenizer.

### 5.2 Configurar o protocolo nativo de Gemma 4

Para uma instalação realmente compatível com Gemma 4, validar as opções oficiais equivalentes a:

```bash
vllm serve <modelo-gemma-4> \
  --enable-auto-tool-choice \
  --tool-call-parser gemma4 \
  --reasoning-parser gemma4 \
  --chat-template examples/tool_chat_template_gemma4.jinja
```

O caminho do template deve existir na versão/container instalado. Se o modelo customizado usar outro
protocolo, deve-se selecionar um parser compatível ou registrar um plugin de parser; não escolher um
parser apenas por tentativa.

### 5.3 Criar um probe fora do Workestrator

Enviar diretamente ao endpoint vLLM um `/v1/chat/completions` com:

- uma ferramenta `write_test_file` fictícia;
- `tool_choice: "auto"`;
- pedido explícito para usar a ferramenta;
- streaming desligado e ligado, em testes separados.

Aceite da fase:

- `message.tool_calls` existe;
- `message.content` não contém uma chamada narrada;
- `function.name` corresponde à ferramenta enviada;
- `function.arguments` é JSON válido e respeita o schema;
- a mesma configuração funciona com streaming.

## 6. Fase 2 — teste de capacidade no cadastro do provider

Adicionar ao teste de conexão do provider uma verificação de ferramentas, separada do teste de texto.

Estados apresentados na UI:

- **Nativo**: provider devolve `message.tool_calls` corretamente;
- **Fallback necessário**: provider narra uma chamada em formato reconhecido;
- **Sem suporte**: ignora tools ou devolve formato incompatível;
- **Erro de configuração**: endpoint recusa `tools`/`tool_choice`.

Persistir uma capacidade do provider, em vez de inferi-la novamente em todo run:

```ts
type ToolCallingMode = "native" | "safe-fallback" | "disabled";
```

O usuário deve poder repetir o probe depois de trocar modelo, template ou flags do servidor.

## 7. Fase 3 — fallback textual seguro no runner

### 7.1 Escopo inicial

Aceitar fallback somente quando todas as condições forem verdadeiras:

- provider configurado como `safe-fallback`;
- agent com `canExecute: true`;
- resposta inteira corresponde a uma gramática de chamada suportada;
- nome resolve para uma ferramenta realmente registrada no run;
- ferramenta pertence ao servidor built-in `workspace`;
- argumentos passam por parsing e validação de schema;
- caminho permanece dentro da workspace isolada do run.

Primeiras ferramentas autorizadas:

- `workspace__write_file`;
- `workspace__read_file`;
- `workspace__list_files`;
- `workspace__render_slides`.

Não habilitar esse fallback inicialmente para HTTP, connectors, publicação, secrets, OAuth ou
qualquer ferramenta com efeito externo.

### 7.2 Gramática aceita

Suportar, de forma estrita, o formato observado:

```txt
call:<nome-da-tool>{<argumentos>}
```

Regras:

- nenhuma prosa antes ou depois;
- exatamente uma chamada por bloco na primeira versão;
- nome composto apenas por caracteres permitidos;
- argumentos em JSON ou subconjunto JSON-like documentado;
- parser sem `eval`, `Function` ou execução de JavaScript;
- tamanho máximo para nome, argumentos e conteúdo;
- escapes, Unicode e quebras de linha testados;
- formato malformado resulta em erro explicativo, nunca em execução parcial.

Depois de convertido, o fluxo deve reutilizar exatamente o executor existente de `OpenAiToolCall`,
emitindo os mesmos eventos `tool_use` e `tool_result` e devolvendo o resultado ao modelo.

### 7.3 Auditoria

Registrar em telemetria/eventos:

- `source: "native" | "narrated-fallback"`;
- provider e modelo;
- nome da ferramenta;
- sucesso/falha;
- argumentos redigidos quando puderem conter segredo;
- motivo de rejeição do fallback.

## 8. Fase 4 — eliminar repetição e runs zumbis

### 8.1 Deduplicação da mesma chamada

Calcular uma fingerprint por run/agent:

```txt
toolName + argumentos normalizados + estado relevante do workspace
```

Se o modelo repetir a mesma chamada sem avanço:

- não criar três artifacts iguais;
- permitir no máximo uma correção orientada;
- na repetição seguinte, encerrar o passo com `TOOL_PROTOCOL_ERROR`;
- mostrar uma mensagem única e acionável na UI.

### 8.2 Sem artifact de sucesso para chamada narrada rejeitada

Uma chamada textual rejeitada deve virar erro de protocolo, não artifact comum do agent. O
coordenador precisa receber o estado de falha e não interpretar o texto como progresso.

### 8.3 Finalização consistente

Garantir que todo cancelamento, timeout ou erro terminal:

- aborte o controller correto pelo `runId`;
- persista `aborted` ou `failed` com `endedAt`;
- remova o run do registro local de ativos;
- libere slot de concorrência;
- preserve arquivos já gerados para diagnóstico;
- nunca deixe registros antigos indefinidamente em `running`.

Adicionar reconciliação na inicialização do app para runs que o backend considera ativos, mas não
possuem controller/processo local correspondente.

## 9. Fase 5 — contexto temporal confiável

Injetar no prompt de cada execução:

```txt
Data atual: 2026-07-22
Fuso horário: America/Sao_Paulo
```

Regras:

- a data vem do runtime, não do modelo;
- testes usam relógio fixo;
- o modelo é instruído a não inventar datas ausentes;
- o teste vLLM valida a data real do contexto.

## 10. Testes necessários

### Unitários do runner

- tool call nativo em JSON não-streaming;
- tool call nativo em SSE fragmentado;
- fallback exato `call:workspace__write_file{...}`;
- argumentos com `\n`, aspas, acentos e chaves no conteúdo;
- chamada com prosa ao redor rejeitada;
- ferramenta desconhecida rejeitada;
- HTTP/publisher via fallback rejeitados;
- tentativa de sair da workspace rejeitada;
- argumentos malformados rejeitados sem gravar arquivo;
- write → read → list em rodadas sucessivas;
- repetição idêntica interrompida;
- teto de iterações preservado.

### Runtime/orquestração

- erro de protocolo não vira artifact concluído;
- coordenador não redispara infinitamente o agent;
- abort marca `endedAt` e libera o slot;
- reabertura do app reconcilia runs zumbis;
- dois runs paralelos não compartilham fingerprints, controllers ou arquivos.

### Integração real

Executar a matriz:

| Cenário | Resultado esperado |
| --- | --- |
| Gemma 4 + vLLM nativo correto | `tool_calls`, arquivo criado, sem fallback |
| Gemma 4 narrando `call:` | fallback local cria arquivo e fica auditado |
| Modelo sem suporte | erro claro, zero arquivo, run finalizado |
| Chamada maliciosa/fora da workspace | bloqueada e auditada |
| Dois runs do mesmo squad | dois arquivos isolados e dois estados independentes |

## 11. Critérios de aceite finais

- o provider informa claramente seu modo de tool calling;
- a configuração nativa de Gemma 4 devolve `message.tool_calls`;
- o fallback nunca executa texto livre nem ferramentas externas;
- `output/vllm-result.md` é criado, lido e listado no mesmo run;
- o manifesto apresenta o arquivo para visualização/download;
- existe apenas um artifact final do agent, sem três chamadas repetidas;
- a data vem do contexto real;
- cancelar ou falhar nunca deixa run em `running`;
- duas execuções paralelas permanecem isoladas;
- testes automatizados e teste real contra o endpoint vLLM passam.

## 12. Ordem recomendada de entrega

1. Capturar versão, comando e modelo exatos do servidor vLLM.
2. Corrigir parser/chat template do Gemma 4 no servidor.
3. Criar probe de tool calling no cadastro do provider.
4. Implementar o fallback restrito às tools locais do workspace.
5. Corrigir deduplicação, erro de protocolo e reconciliação de runs.
6. Injetar data/fuso no contexto.
7. Cobrir unitários, integração real e paralelismo.
8. Liberar primeiro como opção experimental por provider e promover após os testes reais.

## 13. Atualizacao apos probe real do vLLM

Foi confirmado diretamente contra o endpoint vLLM configurado no Workestrator:

- `tool_choice: "auto"` retorna `call:<tool>{...}` em `message.content`;
- `tool_choice: "required"` retorna `message.tool_calls` corretamente;
- `tool_choice` nomeado tambem retorna `message.tool_calls` corretamente.

Portanto, a primeira correcao implementavel no runner e um retry estruturado:

1. enviar normalmente `tools` com `tool_choice: "auto"`;
2. se a resposta vier como `call:<nome-da-tool>{...}`, extrair somente o nome da ferramenta;
3. validar esse nome contra as ferramentas reais registradas no run;
4. refazer a chamada ao provider com `tool_choice` nomeado;
5. executar somente se o provider devolver `message.tool_calls` estruturado;
6. nunca executar os argumentos narrados em texto.

Esse caminho e diferente de fallback textual. Ele usa a chamada textual apenas como pista para escolher
qual ferramenta pedir de forma estruturada ao vLLM. O fallback textual direto deve continuar reservado
para uma etapa posterior, com flag explicita por provider e restricao forte a ferramentas locais de
workspace.
