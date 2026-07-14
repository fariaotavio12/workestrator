# Plano de producao, release e participacao no desenvolvimento do Workestrator

Data do plano: 2026-07-13
Revisao: participacao controlada, sem abertura publica dos repositorios nesta etapa.

Objetivo: colocar o Workestrator no ar com uma superficie web publica segura, manter o app Electron como ambiente principal de execucao local, publicar releases baixaveis pelo site e criar um CTA controlado para pessoas interessadas em participar do desenvolvimento, sem abrir os repositorios publicamente neste momento.

## Decisao de produto

O Workestrator deve ter duas superficies:

- Web hospedada: landing page, login/cadastro, recuperacao de senha, preview/aceite de links compartilhados, pagina de download, documentacao basica e CTA para participar do desenvolvimento.
- App Electron: experiencia privada completa, incluindo runner local, execucao de squads/workouts, ferramentas locais, scripts com filesystem, preview de arquivos locais, cache local e integracoes que dependem da maquina do usuario.

Regra: o usuario pode autenticar na web, mas a web nao deve executar workouts/runs. Quando uma acao depender do runner local, a interface web deve bloquear com CTA para baixar o app desktop.

Motivo: o runner atual depende de Electron/local machine (`electron/runner/*`, servidor local, filesystem, CLI tools e vault/cache local). Liberar execucao no browser aumentaria risco de seguranca e criaria uma segunda arquitetura de runtime sem necessidade para a primeira producao.

## Estado atual observado

Front (`D:\Workspace\front-workestrador`):

- Existe landing em `src/features/public/landing-pages/home/index.tsx`.
- A rota `/` hoje usa `RootRedirect` e manda para login/squads, entao a landing nao aparece na web.
- Existem constantes para `/download`, mas a pagina de download ainda precisa ser criada/registrada.
- Share publico ja existe em `/compartilhar/squad/:token`.
- API client usa `VITE_API_URL`.
- Electron release ja existe em `.github/workflows/electron-release.yml`.
- `electron-builder.yml` publica releases no GitHub (`provider: github`).
- `electron/main.ts` ainda nao implementa auto-update.
- `branding.tsx`, `robots.txt` e `sitemap.xml` usam o dominio publico do Workestrator.
- `.env`, `.env.electron` e `.env.main` estao versionados.

Backend (`D:\Workspace\backend-orquestrador`):

- Deploy Docker para VPS ja existe em `.github/workflows/deploy.yml`.
- Backend usa Spring Boot, PostgreSQL e Docker.
- Secrets do produto sao criptografados em repouso via `SecretCipher` e `SECRETS_MASTER_KEY`.
- Share publico existe em `GET /shares/{token}`.
- Aceite de share exige auth em `POST /shares/{token}/accept`.
- CORS tem fallback `*` em `application.properties`; producao deve sobrescrever com dominio fechado.
- Swagger esta publico por padrao no `SecurityConfig`.
- `.env` e `.env.example` estao versionados.

## Principios obrigatorios

- Nenhum secret real deve ficar em Git.
- `SECRETS_MASTER_KEY` nunca deve ser publicada, nem em `.env` versionado.
- O banco `workestrator_teste` deve ser tratado como staging/teste, nao como producao definitiva.
- Produção deve usar banco separado de dev/teste.
- Releases desktop devem sair somente apos CI verde.
- Rotas privadas continuam protegidas por auth.
- Rotas publicas podem chamar apenas endpoints publicos ou endpoints autenticados seguros.
- Web nao executa runner local.
- Os repositorios nao serao divulgados como abertos/publicos nesta primeira etapa.
- Participacao de terceiros deve passar por formulario, triagem e convite manual.

## Task Execution Checklist

Use esta secao como quadro principal de execucao. As fases abaixo devem ser feitas em ordem, porque as etapas posteriores dependem de dominio, env e roteamento corretos.

Status permitido:

- `[ ]` pendente.
- `[~]` em andamento.
- `[x]` concluido.
- `[!]` bloqueado.

### F0 - Decisoes e escopo

Objetivo: congelar as decisoes que afetam deploy, URLs e release antes de editar codigo.

| Status | ID   | Task                                    | Arquivos/Local                      | Validacao          | Done quando                                                      |
| ------ | ---- | --------------------------------------- | ----------------------------------- | ------------------ | ---------------------------------------------------------------- |
| [x]    | F0.1 | Definir dominio web                     | DNS/Zappyon                         | Abrir plano        | Front definido como `https://workestrator.zappyon.com`           |
| [x]    | F0.2 | Definir dominio API                     | DNS/Zappyon                         | Abrir plano        | API definida como `https://workestrator-api.zappyon.com`         |
| [x]    | F0.3 | Confirmar hospedagem do front           | VPS/Nginx                           | Config VPS         | Front sera servido de `/var/www/workestrator/` pelo Nginx da VPS |
| [ ]    | F0.4 | Confirmar plataforma inicial do desktop | GitHub Actions / Electron           | Decisao registrada | Windows/macOS/Linux ou Windows-only definido                     |
| [ ]    | F0.5 | Confirmar formulario de participacao    | Tally/Typeform/Google Forms/backend | URL do form abre   | Ferramenta escolhida e link criado                               |

### F1 - Secrets, envs e dominios

Objetivo: impedir vazamento de secrets e garantir que front, backend, Electron e CI apontem para os dominios finais.

| Status | ID    | Task                            | Arquivos/Local                              | Validacao                 | Done quando                                                                  |
| ------ | ----- | ------------------------------- | ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| [ ]    | F1.1  | Auditar secrets no front        | `D:\Workspace\front-workestrador`           | Rodar `rg` de secrets     | Nenhum secret real aparece em arquivo versionado                             |
| [ ]    | F1.2  | Auditar secrets no backend      | `D:\Workspace\backend-orquestrador`         | Rodar `rg` de secrets     | Nenhum secret real aparece em arquivo versionado                             |
| [ ]    | F1.3  | Sanitizar `.env` do front       | `.env`, `.env.main`, `.env.electron`        | `git diff`                | Apenas `VITE_API_URL` publico ou localhost seguro                            |
| [ ]    | F1.4  | Sanitizar `.env` do backend     | `.env`, `.env.example`, `.gitignore`        | `git diff`                | `.env` real nao contem segredo versionado ou foi removido do Git             |
| [x]    | F1.5  | Corrigir API URL no front       | `.env.main`, `.env.electron`                | `Get-Content .env.main`   | Ambos apontam para `https://workestrator-api.zappyon.com`                    |
| [x]    | F1.6  | Corrigir API URL no CI Electron | `.github/workflows/electron-release.yml`    | `rg "VITE_API_URL"`       | Workflow escreve `https://workestrator-api.zappyon.com`                      |
| [ ]    | F1.7  | Corrigir branding/SEO web       | `branding.tsx`, `robots.txt`, `sitemap.xml` | `rg "example.com"`        | Nenhum placeholder publico de dominio fica no build                          |
| [x]    | F1.8  | Corrigir backend CORS           | GitHub Secrets / `.env.example`             | Smoke login               | CORS aceita `https://workestrator.zappyon.com`                               |
| [ ]    | F1.9  | Corrigir backend redirects auth | GitHub Secrets / OAuth config               | Testar login Google/senha | Redirect volta para `https://workestrator.zappyon.com`                       |
| [x]    | F1.10 | Validar dominio final           | front/backend                               | `rg dominios`             | Front usa `workestrator.zappyon.com`; API usa `workestrator-api.zappyon.com` |

Comandos de auditoria:

```bash
rg -n "sk-|AKIA|AIza|GOCSPX|postgresql://|jdbc:postgresql://|password=|SECRET|TOKEN|PRIVATE KEY|BEGIN|Bearer |api[_-]?key|client_secret|OPENAI|ANTHROPIC|VOYAGE|CLOUDFLARE|FIREBASE|SENTRY_DSN|DB_PASSWORD" -g "!node_modules/**" -g "!dist/**" -g "!dist-electron/**" -g "!release/**" -g "!build/**" -g "!.git/**"
rg -n "workestrator\.zappyon\.com|example.com|api.workestrator|VITE_API_URL"
```

### F2 - Rotas web, dashboard e bloqueio browser

Objetivo: separar landing publica e area privada, usando `/dashboard` como base canonica de todas as telas autenticadas em vez de `/orquestrador`.

| Status | ID    | Task                                      | Arquivos/Local                          | Validacao               | Done quando                                                                          |
| ------ | ----- | ----------------------------------------- | --------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| [ ]    | F2.1  | Criar helper de ambiente web/Electron     | `src/app` ou `src/app/utils`            | Build web/Electron      | Codigo consegue diferenciar `mode === "electron"`                                    |
| [x]    | F2.2  | Restaurar landing em `/` na web           | `src/app/routing/index.tsx`             | `npx tsc -b`            | Landing aparece sem login na web                                                     |
| [ ]    | F2.3  | Manter entrada privada no Electron        | `RootRedirect` / router                 | Build Electron          | `/` no Electron vai para login/app                                                   |
| [ ]    | F2.4  | Criar rota privada canonica `/app`        | `variables.ts`, router                  | Abrir `/app` logado     | Redireciona para `/dashboard` ou ultima rota privada                                 |
| [x]    | F2.5  | Criar/reabilitar `/dashboard`             | `src/app/routing/index.tsx`             | `npx tsc -b`            | `/dashboard` renderiza o historico de execucoes                                      |
| [x]    | F2.6  | Migrar rotas privadas para base dashboard | `variables.ts`, router, sidebar         | `npx tsc -b`            | Squads, detalhe, execucoes e segredos vivem sob `/dashboard*`                        |
| [x]    | F2.7  | Preservar destino apos login              | `middleware.tsx`, login page            | `npx tsc -b`            | Deslogado vai para landing e login volta para rota original                          |
| [x]    | F2.8  | Remover redirect fixo para squads         | `RootRedirect`, `MiddlewareAuth`, login | `rg "dashboard.squads"` | Login/root mandam para `/dashboard`                                                  |
| [x]    | F2.9  | Atualizar sidebar/nav                     | `src/components/sidebar/*`              | `npx tsc -b`            | Dashboard, Squads, Execucoes, Modelos, Scripts e Segredos apontam para `/dashboard*` |
| [x]    | F2.10 | Remover debug de producao                 | `middlewareAuth.tsx`                    | `rg "console.log"`      | Debug removido do middleware de auth                                                 |
| [ ]    | F2.11 | Bloquear runner no browser                | run dialog/runtime/scripts              | Tentar rodar na web     | Web mostra CTA para baixar desktop                                                   |

Critérios de aceite da fase:

- [x] `/` web mostra landing.
- [ ] `/app` logado cai em `/dashboard` ou na ultima rota privada usada.
- [x] `/dashboard` existe e permanece em `/dashboard`.
- [x] `/dashboard`, `/dashboard/squads`, `/dashboard/squads/:id` e `/dashboard/segredos` sao as rotas oficiais.
- [x] Rota protegida sem login vai para landing e volta para destino original apos autenticar.
- [ ] Browser nao chama runner local de producao.

### F3 - Downloads, release manifest e auto-update

Objetivo: fazer toda release do CI aparecer no site e no app instalado.

| Status | ID   | Task                                     | Arquivos/Local                    | Validacao              | Done quando                                                  |
| ------ | ---- | ---------------------------------------- | --------------------------------- | ---------------------- | ------------------------------------------------------------ |
| [x]    | F3.1 | Criar pagina publica `/download`         | `src/features/public/download`    | `npx tsc -b`           | Pagina carrega sem login                                     |
| [x]    | F3.2 | Criar fonte de releases                  | GitHub Releases / CI + VPS        | Abrir `/releases.json` | CI gera manifesto publico a partir da release Electron       |
| [x]    | F3.3 | Publicar assets desktop em local publico | CI release/VPS                    | Baixar `.exe`          | Workflow copia assets para `/var/www/workestrator/releases/` |
| [x]    | F3.4 | Renderizar assets por sistema            | pagina download                   | `npx tsc -b`           | Botao aparece conforme asset disponivel                      |
| [ ]    | F3.5 | Adicionar changelog publico              | site/storage                      | Abrir changelog        | Usuario entende versao e mudancas                            |
| [ ]    | F3.6 | Instalar `electron-updater`              | `package.json`                    | `npm install` + build  | Dependencia adicionada                                       |
| [ ]    | F3.7 | Implementar checagem de update           | `electron/main.ts`                | App empacotado         | App consulta canal de release                                |
| [ ]    | F3.8 | Criar IPC/eventos de update              | `main.ts`, `preload.ts`, renderer | Simular update         | UI recebe status de update                                   |
| [ ]    | F3.9 | Validar update instalado                 | app instalado                     | Publicar versao nova   | App avisa e reinicia para atualizar                          |

Critérios de aceite da fase:

- [x] `/download` busca a ultima release publicada no manifesto publico.
- [x] Usuario consegue baixar instalador pelo site apos workflow publicar assets na VPS.
- [x] Nova release aparece no site apos `electron-release.yml` concluir.
- [ ] App instalado detecta update.

### F4 - Participacao no desenvolvimento

Objetivo: captar interessados sem abrir repositorio publicamente.

| Status | ID   | Task                                         | Arquivos/Local                             | Validacao             | Done quando                              |
| ------ | ---- | -------------------------------------------- | ------------------------------------------ | --------------------- | ---------------------------------------- |
| [ ]    | F4.1 | Criar formulario externo ou endpoint proprio | Tally/Typeform/backend                     | Enviar resposta teste | Dados chegam para revisao                |
| [ ]    | F4.2 | Criar rota `/participar`                     | `src/features/public/development-interest` | Abrir rota            | Pagina publica existe                    |
| [ ]    | F4.3 | Linkar CTA na landing                        | landing home                               | Clicar CTA            | Vai para `/participar` ou form           |
| [ ]    | F4.4 | Linkar CTA no download                       | download page                              | Clicar CTA            | Vai para `/participar` ou form           |
| [ ]    | F4.5 | Escrever copy sem promessa de acesso         | landing/download/participar                | Revisao manual        | Nao fala codigo aberto/acesso automatico |

Critérios de aceite da fase:

- [ ] Usuario consegue manifestar interesse.
- [ ] Voce consegue visualizar os dados enviados.
- [ ] Site nao promete acesso publico ao codigo.

### F5 - Deploy VPS e DNS

Objetivo: colocar backend e frontend no ar com HTTPS e fallback SPA correto.

| Status | ID    | Task                             | Arquivos/Local                      | Validacao                                                      | Done quando                                                                    |
| ------ | ----- | -------------------------------- | ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [x]    | F5.1  | Criar DNS frontend               | Zappyon/DNS                         | `curl -I`                                                      | `workestrator.zappyon.com` resolve e responde                                  |
| [x]    | F5.2  | Criar DNS API                    | Zappyon/DNS                         | `getent hosts`                                                 | `workestrator-api.zappyon.com` resolve para a VPS                              |
| [x]    | F5.3  | Configurar HTTPS front           | Nginx/Certbot                       | `curl -I`                                                      | `https://workestrator.zappyon.com` responde 200 com certificado valido         |
| [x]    | F5.4  | Configurar HTTPS API             | Nginx/Certbot                       | `curl -I`                                                      | `https://workestrator-api.zappyon.com` chega no backend com certificado valido |
| [x]    | F5.5  | Subir backend Docker             | VPS                                 | `docker ps` / `curl`                                           | Container `backend-orquestrador-main` responde via proxy na porta 8092         |
| [x]    | F5.6  | Subir front web                  | VPS/Nginx                           | `curl -I`                                                      | Nginx serve `/var/www/workestrator/` em `workestrator.zappyon.com`             |
| [x]    | F5.7  | Configurar fallback SPA          | Nginx site da VPS                   | `try_files`                                                    | Host do front usa `try_files $uri $uri/ /index.html`                           |
| [x]    | F5.8  | Configurar workflow deploy web   | `.github/workflows/deploy.yml`      | `git diff`                                                     | CI copia `dist/` para `/var/www/workestrator/`                                 |
| [x]    | F5.9  | Configurar secrets do deploy web | GitHub Actions secrets              | `gh secret list`                                               | `VPS_HOST`, `VPS_USER` e `VPS_SSH_KEY` configurados                            |
| [x]    | F5.10 | Validar cookies/CORS             | Browser devtools / `curl` preflight | Preflight e POST retornam headers CORS para o dominio do front |

Critérios de aceite da fase:

- [x] `https://workestrator.zappyon.com` abre.
- [~] `https://workestrator-api.zappyon.com` responde via backend; `/public/health` especifico retornou 404 e precisa confirmar path correto.
- [x] Login web testado no browser apos correcao de CORS.
- [ ] Refresh em `/dashboard`, `/download`, `/participar` e share funciona.

### F6 - Verificacao final e smoke test

Objetivo: provar que producao, web, Electron, release e rotas estao funcionando.

| Status | ID    | Task                       | Comando/Fluxo                      | Done quando               |
| ------ | ----- | -------------------------- | ---------------------------------- | ------------------------- |
| [ ]    | F6.1  | Rodar lint front           | `npm run lint`                     | Sem erro bloqueante       |
| [ ]    | F6.2  | Rodar build web            | `npm run build:main`               | `dist/` gerado            |
| [ ]    | F6.3  | Rodar build Electron       | `npm run electron:build`           | Artefato gerado           |
| [ ]    | F6.4  | Rodar testes backend       | `./gradlew test`                   | Testes passam             |
| [ ]    | F6.5  | Rodar build backend        | `./gradlew build`                  | Jar gerado                |
| [ ]    | F6.6  | Testar landing             | Abrir dominio                      | Landing aparece           |
| [ ]    | F6.7  | Testar cadastro/login      | Criar conta e entrar               | Sessao funciona           |
| [ ]    | F6.8  | Testar share publico       | Abrir `/compartilhar/squad/:token` | Preview aparece sem login |
| [ ]    | F6.9  | Testar aceite de share     | Logar e aceitar                    | Squad importado           |
| [ ]    | F6.10 | Testar bloqueio runner web | Tentar executar na web             | CTA para desktop aparece  |
| [ ]    | F6.11 | Testar app desktop         | Instalar e logar                   | App usa API producao      |
| [ ]    | F6.12 | Testar update              | Publicar nova versao               | App detecta update        |

Go/no-go para publicar:

- [ ] F1 completo.
- [ ] F2 completo.
- [ ] F5 completo.
- [ ] F6.1 a F6.9 completos.
- [ ] Nenhum secret real em Git.
- [ ] Nenhum dominio antigo em build de producao.

## Fase 0 - Congelar escopo do dia

Objetivo: evitar que a entrega de producao vire uma refatoracao ampla.

Checklist:

- [x] Definir dominio final do site: `https://workestrator.zappyon.com`.
- [x] Definir dominio da API: `https://workestrator-api.zappyon.com`.
- [ ] Confirmar repositorios GitHub finais:
  - Front: `fariaotavio12/front-workestrador`
  - Backend: `fariaotavio12/backend-orquestrador`
- [ ] Confirmar se o site sera servido na VPS via Nginx/container ou por plataforma externa.
- [ ] Confirmar se a primeira release desktop precisa de Windows apenas ou Windows/macOS/Linux.
- [ ] Confirmar ferramenta do formulario de participacao: backend proprio, Tally, Typeform, Google Forms, Airtable ou Notion.

Entregavel:

- Uma decisao curta registrada no README ou issue: dominios, estrategia de deploy e plataformas da primeira release.

## Fase 1 - Sanitizacao e seguranca antes de publicar

Objetivo: garantir que nada comprometedor va para publico.

### 1.1 Auditar arquivos versionados

Executar no front:

```bash
git ls-files .env .env.electron .env.main .env.example
rg -n "sk-|AKIA|AIza|GOCSPX|postgresql://|jdbc:postgresql://|password=|SECRET|TOKEN|PRIVATE KEY|BEGIN|Bearer |api[_-]?key|client_secret|OPENAI|ANTHROPIC|VOYAGE|CLOUDFLARE|FIREBASE|SENTRY_DSN|DB_PASSWORD" -g "!node_modules/**" -g "!dist/**" -g "!dist-electron/**" -g "!release/**" -g "!build/**" -g "!.git/**"
```

Executar no backend:

```bash
git ls-files .env .env.example
rg -n "sk-|AKIA|AIza|GOCSPX|postgresql://|jdbc:postgresql://|password=|SECRET|TOKEN|PRIVATE KEY|BEGIN|Bearer |api[_-]?key|client_secret|OPENAI|ANTHROPIC|VOYAGE|CLOUDFLARE|FIREBASE|SENTRY_DSN|DB_PASSWORD" -g "!build/**" -g "!.gradle/**" -g "!.git/**"
```

Critérios de pronto:

- [ ] Nenhum valor real de secret aparece em arquivo versionado.
- [ ] Nenhuma URL de banco real com usuario/senha aparece em Git.
- [ ] Nenhum token de provedor aparece em Git.
- [ ] Nenhuma chave Firebase/Cloudflare/Sentry sensivel aparece em Git.

### 1.2 Decidir politica de `.env`

Recomendacao forte:

- Backend: remover `.env` do Git e manter apenas `.env.example`.
- Front: permitir `.env`, `.env.main`, `.env.electron` no Git somente se contiverem valores publicos, como `VITE_API_URL`.

Se a decisao for versionar `.env`, o conteudo deve ser explicitamente nao secreto:

```env
DB_URL=jdbc:postgresql://localhost:5432/workestrator_teste
DB_USERNAME=workestrator_local
DB_PASSWORD=change-me-local-only
SECRETS_MASTER_KEY=
```

Critérios de pronto:

- [ ] `.env.example` do backend tem todas as chaves necessarias e valores vazios/placeholder.
- [ ] `.env` real de producao fica apenas em GitHub Secrets ou no servidor.
- [ ] `.gitignore` permanece protegendo `.env` real quando aplicavel.
- [ ] Qualquer secret que ja tenha sido commitado e seja real foi rotacionado.

### 1.3 Endurecer backend para producao

Variaveis obrigatorias na VPS/GitHub Secrets:

```env
DB_URL=
DB_USERNAME=
DB_PASSWORD=
JPA_DDL_AUTO=update
APP_CORS_ALLOWED_ORIGIN_PATTERNS=https://workestrator.zappyon.com
APP_AUTH_SECURE_COOKIE=true
APP_AUTH_SAME_SITE=Lax
APP_AUTH_GOOGLE_SUCCESS_REDIRECT=https://workestrator.zappyon.com/auth/google/success
APP_AUTH_PASSWORD_RESET_BASE_URL=https://workestrator.zappyon.com/recuperar-senha
APP_AUTH_ALLOWED_REDIRECT_HOSTS=workestrator.zappyon.com,workestrator-api.zappyon.com
APP_AUTH_ALLOW_TOKEN_IN_QUERY_REDIRECT=true
SECRETS_MASTER_KEY=
```

Regras:

- [ ] `APP_CORS_ALLOWED_ORIGIN_PATTERNS` nao pode ficar `*` em producao.
- [ ] `SECRETS_MASTER_KEY` precisa ser base64 de 32 bytes.
- [ ] Guardar `SECRETS_MASTER_KEY` com backup seguro. Perder essa chave impede descriptografar secrets existentes.
- [ ] Avaliar bloquear Swagger em producao ou liberar apenas por IP/auth.

### 1.4 Troca coordenada de dominios front/backend

Objetivo: trocar todas as referencias antigas sem quebrar login, cookies, OAuth, build web e build Electron.

Dominios finais:

```txt
Frontend: https://workestrator.zappyon.com
Backend/API: https://workestrator-api.zappyon.com
```

Referencias antigas a procurar e remover:

```txt
https://workestrator.zappyon.com
https://workestrator-api.zappyon.com
http://localhost:8080 em arquivos de producao
```

Front - arquivos provaveis:

- `.env.main`
- `.env.electron`
- `.github/workflows/electron-release.yml`
- `src/app/config/branding.tsx`
- `public/robots.txt`
- `public/sitemap.xml`
- Qualquer chamada hardcoded encontrada por `rg "example.com|api.workestrator|VITE_API_URL"`.

Backend - arquivos/configuracoes provaveis:

- `.env.example`
- `.github/workflows/deploy.yml`
- `src/main/resources/application.properties`
- GitHub Secrets de producao.
- Google OAuth authorized redirect/callback URLs.
- Configuracao de CORS e allowed redirect hosts.

Valores finais no front:

```env
VITE_API_URL=https://workestrator-api.zappyon.com
```

Valores finais no backend:

```env
APP_CORS_ALLOWED_ORIGIN_PATTERNS=https://workestrator.zappyon.com
APP_AUTH_GOOGLE_SUCCESS_REDIRECT=https://workestrator.zappyon.com/auth/google/success
APP_AUTH_PASSWORD_RESET_BASE_URL=https://workestrator.zappyon.com/recuperar-senha
APP_AUTH_ALLOWED_REDIRECT_HOSTS=workestrator.zappyon.com,workestrator-api.zappyon.com
APP_AUTH_SECURE_COOKIE=true
APP_AUTH_SAME_SITE=Lax
```

Observacao sobre cookie: como front e API estao em subdominios do mesmo site (`workestrator.zappyon.com` e `workestrator-api.zappyon.com`), `SameSite=Lax` tende a funcionar e e mais conservador. Testar login com cookie HttpOnly; se o navegador nao enviar cookie em algum fluxo real, trocar para `SameSite=None; Secure`. O bearer token retornado no login continua como fallback para Electron e browser via `tokenStorage`, mas o cookie deve funcionar para web.

Critérios de pronto:

- [x] `rg "workestrator.zappyon.com"` retorna apenas referencias esperadas do dominio oficial do frontend.
- [ ] `rg "example.com"` nao retorna referencias publicas de producao.
- [x] `.env.main` e `.env.electron` apontam para `https://workestrator-api.zappyon.com`.
- [x] Workflow `electron-release.yml` escreve `VITE_API_URL=https://workestrator-api.zappyon.com`.
- [x] Backend aceita CORS de `https://workestrator.zappyon.com`.
- [ ] Login web funciona com `withCredentials: true`.
- [ ] Login Electron funciona no build empacotado.
- [ ] OAuth Google redireciona de volta para `https://workestrator.zappyon.com`.

Comando para gerar `SECRETS_MASTER_KEY`:

```bash
openssl rand -base64 32
```

## Fase 2 - Web publica

Objetivo: restaurar a landing na web sem quebrar a experiencia Electron.

### 2.1 Separar comportamento web vs Electron

Criar helper de ambiente, por exemplo:

```ts
export const isElectronBuild = import.meta.env.MODE === "electron";
```

Aplicar no roteamento:

- Web:
  - `/` renderiza `HomePage`.
  - `/download` renderiza pagina de download.
  - `/compartilhar/squad/:token` continua publico.
  - `/login`, `/registrar`, `/recuperar-senha` continuam publicos.
- Electron:
  - `/` continua redirecionando para `/app` se logado ou login se deslogado.
  - Landing/download podem existir, mas nao devem atrapalhar o fluxo principal.

Arquivos provaveis:

- `src/app/routing/index.tsx`
- `src/app/routing/rootRedirect.tsx`
- `src/app/routing/variables.ts`
- `src/features/public/landing-pages/home/index.tsx`

Critérios de pronto:

- [ ] Build web em `/` mostra landing.
- [ ] Build Electron em `/` abre login/squads.
- [ ] Usuario logado na web nao perde acesso as rotas privadas.
- [ ] Share publico abre sem auth.

### 2.2 Melhorar estrategia de rotas e dashboard

Problema atual: as rotas protegidas tendem a cair sempre em `/orquestrador/squads`, mesmo quando o usuario tenta acessar dashboard, voltar para uma rota especifica ou entrar depois de abrir um link protegido. Isso confunde a navegacao e deixa o produto parecendo ter uma unica area.

Objetivo: tornar `/dashboard` a base canonica da area privada. O termo "orquestrador" pode continuar no produto/copy, mas nao deve ser a base das URLs principais.

Regras propostas:

- `/` na web publica mostra landing.
- `/app` vira a entrada autenticada canonica.
- `/app` redireciona para a ultima area usada ou para `/dashboard`.
- `/dashboard` deve existir como home privada.
- Squads, execucoes, modelos, scripts, segredos e conhecimento devem ficar sob `/dashboard/*`.
- `/orquestrador/*` deixa de ser rota primaria e vira apenas redirect legado temporario.
- Login deve respeitar `state.from` quando o usuario veio de uma rota protegida.
- Depois de login manual direto, ir para `/app`, nao para squads.
- Electron pode continuar abrindo direto em `/app` e de la decidir o destino.

Rotas sugeridas:

```txt
/                         landing publica
/download                 download publico
/participar               formulario publico de participacao
/compartilhar/squad/:token preview publico de squad
/login                    login
/registrar                cadastro
/recuperar-senha          recuperacao
/app                      entrada privada canonica
/dashboard                historico de execucoes
/dashboard/squads         modulo de squads
/dashboard/squads/:id     detalhe do squad
/dashboard/segredos       secrets
/dashboard/modelos        modelos/providers
/dashboard/scripts        scripts/ferramentas
/dashboard/conhecimento   bases de conhecimento
```

Arquivos provaveis:

- `src/app/routing/variables.ts`
- `src/app/routing/index.tsx`
- `src/app/routing/rootRedirect.tsx`
- `src/app/routing/middleware.tsx`
- `src/app/routing/middlewareAuth.tsx`
- `src/features/public/auth/login/index.tsx`
- `src/features/security/layout.tsx`
- `src/components/sidebar/navMain.tsx`

Tarefas:

- [ ] Adicionar `Rotas.protegidas.app = "/app"`.
- [ ] Criar ou reativar uma `PageDashboardHome` em `src/features/security/dashboard`.
- [x] Registrar `/dashboard` como rota protegida real.
- [ ] Fazer `/app` redirecionar para `/dashboard` ou para a ultima rota privada usada.
- [x] Reorganizar constantes para uma base dashboard, com `Rotas.protegidas.orchestrator.executions = "/dashboard"` e `Rotas.protegidas.orchestrator.squads = "/dashboard/squads"`.
- [x] Trocar rotas oficiais de squads, execucoes, segredos, modelos, scripts e conhecimento para `/dashboard*`.
- [x] Remover redirecionamentos fixos para `/orquestrador/squads` em login/root quando a intencao for "home do app".
- [ ] Preservar destino original no login: se o usuario tentou `/dashboard/squads/123`, voltar para essa rota apos autenticar.
- [x] Criar redirects legados temporarios:
  - `/orquestrador/squads` -> `/dashboard/squads`
  - `/orquestrador/squads/:id` -> `/dashboard/squads/:id`
  - `/orquestrador/execucoes` -> `/dashboard`
  - `/orquestrador/segredos` -> `/dashboard/segredos`
- [ ] Criar fallback para aliases curtos se necessario, por exemplo `/squads` -> `/dashboard/squads`.
- [x] Garantir que sidebar/navbar destaque a area correta: Dashboard, Squads, Execucoes, Modelos, Scripts, Segredos.
- [x] Remover `console.log` de debug em middleware antes de producao.

Critérios de pronto:

- [x] Abrir `/dashboard` logado nao redireciona para `/orquestrador` e renderiza execucoes.
- [ ] Abrir `/app` logado cai em uma home privada previsivel.
- [ ] Abrir rota protegida sem login leva para `/login` e volta para a rota original apos login.
- [x] Abrir `/dashboard/squads/:id` funciona como detalhe de squad.
- [x] Abrir `/orquestrador/squads/:id` redireciona para `/dashboard/squads/:id` sem quebrar links antigos.
- [ ] Abrir `/` na web deslogado mostra landing, nao login.
- [ ] Abrir `/` no Electron continua com fluxo privado.
- [ ] Refresh em qualquer rota privada funciona no deploy SPA.

### 2.3 Criar pagina de download

Criar feature publica:

```txt
src/features/public/download/
  index.tsx
  api/
    index.ts
    keys.ts
    service.ts
    types.ts
```

Opcoes para alimentar releases:

Opcao A - Manifest publico gerado no CI:

- CI gera `releases.json` com versao, data, changelog e URLs dos assets.
- Assets ficam em local publico controlado: VPS, bucket S3/R2, Cloudflare R2 publico ou pasta publica do site.
- Funciona mesmo com repositorio privado.
- Recomendado para nao expor o codigo e evitar rate limit.

Opcao B - GitHub Releases API publica:

- Endpoint: `https://api.github.com/repos/fariaotavio12/front-workestrador/releases/latest`
- Simples apenas se o repositorio ou as releases forem publicas.
- Nao recomendado se a decisao e nao abrir o repositorio agora.

Recomendacao para hoje: Opcao A.

Conteudo da pagina:

- Ultima versao.
- Botoes por plataforma:
  - Windows `.exe`
  - macOS `.dmg`
  - Linux `.AppImage`
- Link para changelog publico, sem expor repositorio privado.
- Nota: "A execucao dos squads acontece no app desktop".
- CTA secundario: "Quero participar do desenvolvimento".

Critérios de pronto:

- [ ] `/download` carrega sem login.
- [ ] Mostra estado de loading.
- [ ] Mostra erro amigavel se GitHub API falhar.
- [ ] Botao certo para cada asset disponivel.
- [ ] Link fallback para changelog/download publico.

### 2.4 Travar execucao no browser

Implementar guard visual/funcional para recursos que dependem do runner:

- Start run/workout.
- Testar tools locais.
- Preview de arquivos locais.
- Reset workspace.
- Snapshot local.
- OAuth desktop loopback quando depender de Electron.

Arquivos provaveis:

- `src/components/orchestrator/run-dialog/run-dialog.tsx`
- `src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts`
- `src/features/security/config-assistant/*`
- `src/features/security/scripts/*`
- `src/features/security/secrets/*`

Padrao esperado:

- Web: botao desabilitado ou dialog com CTA para `/download`.
- Electron: comportamento atual.

Critérios de pronto:

- [ ] Nenhuma chamada web tenta acessar `/api/run-step` local em producao.
- [ ] Usuario entende que precisa do app desktop.
- [ ] Login web e aceite de share continuam funcionando.

## Fase 3 - Releases e auto-update Electron

Objetivo: cada release publicada no CI vira download no site e atualizacao para usuarios instalados.

### 3.1 Confirmar release CI

Fluxo atual:

- `CI` roda lint/build na `main`.
- `Electron Release` roda depois de CI com sucesso.
- Matrix: Windows, macOS, Linux.
- `electron-builder` publica GitHub Release.

Critérios de pronto:

- [ ] Release so publica apos CI verde.
- [ ] Assets aparecem no GitHub Release.
- [ ] `latest.yml`/metadados de update aparecem quando aplicavel.
- [ ] Versao fica clara para o usuario.

### 3.2 Implementar auto-update

Adicionar dependencia:

```bash
npm install electron-updater
```

No `electron/main.ts`:

- Importar `autoUpdater`.
- Chamar `autoUpdater.checkForUpdatesAndNotify()` quando o app estiver pronto e empacotado.
- Enviar eventos para renderer:
  - `update:checking`
  - `update:available`
  - `update:not-available`
  - `update:download-progress`
  - `update:downloaded`
  - `update:error`
- Criar IPC para instalar/reiniciar:
  - `update:quit-and-install`

No renderer:

- Mostrar toast discreto quando houver update.
- Mostrar acao "Reiniciar para atualizar" quando baixado.
- Nao interromper execucao de squad em andamento sem confirmacao.

Critérios de pronto:

- [ ] App instalado consulta o canal de releases configurado.
- [ ] Update baixado aparece no app.
- [ ] Usuario consegue reiniciar e instalar.
- [ ] Erro de update nao quebra inicializacao.

Observacao: macOS update profissional exige assinatura/notarizacao. Para primeira entrega, validar Windows primeiro.

## Fase 4 - CTA de participacao no desenvolvimento

Objetivo: captar pessoas interessadas em testar, sugerir features, reportar bugs ou colaborar tecnicamente, mantendo acesso ao codigo e ao roadmap sob controle.

### 4.1 Modelo recomendado

Criar uma rota publica:

```txt
/participar
```

Essa pagina deve ter um formulario curto e objetivo. Ela nao deve prometer acesso automatico ao codigo, merge, parceria ou suporte. O texto deve deixar claro que os dados serao avaliados manualmente.

CTA sugerido na landing:

```txt
Participar do desenvolvimento
```

Copy sugerida:

```txt
Quer ajudar a moldar o Workestrator?
Estamos reunindo devs, builders e usuarios tecnicos para testar releases, sugerir fluxos e colaborar em integracoes. Preencha o formulario e eu entro em contato quando fizer sentido para a etapa atual.
```

### 4.2 Campos do formulario

Campos essenciais:

- Nome.
- Email.
- GitHub ou LinkedIn.
- Perfil: dev frontend, dev backend, produto/design, usuario testador, criador de automacoes/agents ou outro.
- Como quer participar: testar builds, reportar bugs, sugerir features, contribuir com codigo, criar templates de squads ou ajudar com documentacao.
- Sistema operacional principal: Windows, macOS ou Linux.
- Experiencia com IA/agents/automacao.
- Mensagem livre.
- Consentimento para contato.

Campos opcionais:

- Empresa/projeto.
- Cidade/pais.
- Disponibilidade semanal.
- Link de portfolio.

### 4.3 Implementacao rapida para hoje

Opcao A - Form externo:

- Tally, Typeform, Google Forms, Airtable Forms ou Notion Forms.
- Mais rapido.
- Sem backend novo.
- Embed ou link direto a partir de `/participar`.

Opcao B - Form proprio no backend:

- Criar endpoint publico `POST /public/development-interest`.
- Salvar no banco.
- Criar tabela simples para leads.
- Enviar email/notificacao para o dono.
- Mais controle, mas mais trabalho.

Recomendacao para hoje: Opcao A. Depois migrar para backend proprio se o volume justificar.

### 4.4 Arquivos provaveis no front

```txt
src/features/public/development-interest/
  index.tsx
```

Rotas:

- Adicionar `Rotas.desprotegidas.developmentInterest = "/participar"`.
- Registrar rota em `src/app/routing/index.tsx`.
- Linkar CTA na landing e na pagina de download.

### 4.5 Governanca privada

Mesmo sem abrir o repositorio:

- Manter branch protection na `main`.
- Exigir PR para qualquer mudanca.
- CI obrigatorio.
- Aprovacao do dono antes de merge.
- Dar acesso ao repositorio somente por convite.
- Remover acesso de colaboradores inativos periodicamente.

Critérios de pronto:

- [ ] Landing tem CTA para participar.
- [ ] `/participar` existe e funciona.
- [ ] Formulario coleta dados suficientes para triagem.
- [ ] Usuario entende que o contato nao e automatico.
- [ ] Dados chegam em lugar facil de revisar.
- [ ] Nao ha link publico para repositorio privado.

### 4.6 Copy para evitar promessa errada

Evitar:

- "Codigo aberto".
- "Contribua direto no repositorio".
- "Acesso liberado automaticamente".
- "Qualquer pessoa pode fazer update".

Usar:

- "Participe do desenvolvimento".
- "Entre para a lista de testers".
- "Sugira integracoes e fluxos".
- "Colaboradores sao convidados conforme a etapa do produto".

## Fase 5 - Deploy na VPS

Objetivo: hospedar front e backend com HTTPS, dominio real e deploy repetivel.

### 5.1 Topologia recomendada

Dominios:

- `https://workestrator.zappyon.com` -> front web.
- `https://workestrator-api.zappyon.com` -> backend/API.

Na VPS:

- Nginx ou Caddy como reverse proxy.
- Backend Docker na porta interna atual `8092`.
- Front pode rodar como container Nginx ou arquivos estaticos servidos pelo proxy.

### 5.2 Backend

Ja existe workflow:

- `.github/workflows/deploy.yml`
- Docker image: `fariaotavio12/backend-orquestrador:main`
- Container: `backend-orquestrador-main`
- Host port: `8092`

Secrets necessarios no GitHub:

```txt
DOCKER_USER
DOCKER_TOKEN
VPS_HOST
VPS_USER
VPS_SSH_KEY
DB_URL_PROD
DB_USERNAME_PROD
DB_PASSWORD_PROD
JPA_DDL_AUTO
APP_CORS_ALLOWED_ORIGIN_PATTERNS
APP_AUTH_COOKIE_NAME
APP_AUTH_COOKIE_MAX_AGE
APP_AUTH_SESSION_DURATION_HOURS
APP_AUTH_SECURE_COOKIE
APP_AUTH_SAME_SITE
APP_AUTH_GOOGLE_SUCCESS_REDIRECT
APP_AUTH_PASSWORD_RESET_BASE_URL
APP_AUTH_ALLOWED_REDIRECT_HOSTS
APP_AUTH_ALLOW_TOKEN_IN_QUERY_REDIRECT
APP_MAIL_ENABLED
MAIL_HOST
MAIL_PORT
MAIL_USERNAME
MAIL_PASSWORD
APP_MAIL_FROM_EMAIL
APP_MAIL_FROM_NAME
APP_STORAGE_CLOUDFLARE_ENABLED
APP_STORAGE_CLOUDFLARE_ACCOUNT_ID
APP_STORAGE_CLOUDFLARE_ACCESS_KEY_ID
APP_STORAGE_CLOUDFLARE_SECRET_ACCESS_KEY
APP_STORAGE_CLOUDFLARE_BUCKET
APP_STORAGE_CLOUDFLARE_REGION
APP_STORAGE_CLOUDFLARE_PUBLIC_URL_BASE
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
ANTHROPIC_API_KEY
FIREBASE_SERVICE_ACCOUNT_BASE64
SENTRY_DSN
SENTRY_ENVIRONMENT
APP_AI_EMBEDDINGS_PROVIDER
APP_AI_EMBEDDINGS_MODEL
APP_AI_EMBEDDINGS_DIMENSIONS
VOYAGE_API_KEY
SECRETS_MASTER_KEY_PROD
```

Critérios de pronto:

- [ ] `GET https://workestrator-api.zappyon.com/public/health` responde.
- [ ] Login funciona a partir do front.
- [ ] CORS aceita apenas dominio esperado.
- [ ] Cookies sao `Secure`.

### 5.3 Front

Ajustar build web:

- `.env.main` e `.env.electron`:

```env
VITE_API_URL=https://workestrator-api.zappyon.com
```

Build:

```bash
npm ci
npm run build:main
```

Deploy escolhido:

- `.github/workflows/deploy.yml` faz build com `npm run build:main`.
- Workflow publica `dist/` na VPS em `/var/www/workestrator/`.
- Nginx serve os arquivos estaticos em `https://workestrator.zappyon.com`.
- Secrets GitHub ja configurados para o front: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

Nginx precisa de fallback SPA:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Critérios de pronto:

- [x] `https://workestrator.zappyon.com/` responde pelo Nginx da VPS.
- [ ] `https://workestrator.zappyon.com/download` mostra releases.
- [ ] `https://workestrator.zappyon.com/login` funciona.
- [x] Refresh em rota interna nao retorna 404; `/dashboard` e `/download` retornam 200 pelo fallback SPA.
- [ ] `robots.txt` e `sitemap.xml` usam dominio real.

## Fase 6 - SEO, branding e links publicos

Objetivo: remover placeholders e deixar a primeira visita apresentavel.

Arquivos:

- `src/app/config/branding.tsx`
- `src/app/lib/seo.ts`
- `public/robots.txt`
- `public/sitemap.xml`
- `public/og-image.jpg`
- `src/features/public/landing-pages/home/index.tsx`

Checklist:

- [ ] Trocar `https://workestrator.zappyon.com` por `https://workestrator.zappyon.com`.
- [x] Manter `workestrator.zappyon.com` como dominio oficial do frontend.
- [ ] Trocar qualquer API antiga por `https://workestrator-api.zappyon.com`.
- [ ] Atualizar descricao do produto.
- [ ] Adicionar link para changelog publico.
- [ ] Adicionar link para formulario de participacao.
- [ ] CTA principal: baixar app desktop.
- [ ] CTA secundario: participar do desenvolvimento.
- [ ] Copy publica explica que execucao roda localmente no desktop.

Critérios de pronto:

- [ ] Compartilhamento social mostra titulo/imagem corretos.
- [ ] Google nao indexa dashboard/login como conteudo principal.
- [ ] Landing comunica participacao/early access sem prometer abertura publica do codigo.

## Fase 7 - Testes e validacao

### 7.1 Front

Rodar:

```bash
npm run lint
npm run build:main
npm run build
npm run electron:build
```

Critérios:

- [ ] Sem erro TypeScript.
- [ ] Sem erro ESLint bloqueante.
- [ ] Build web gera `dist`.
- [ ] Build Electron gera artefato local.

### 7.2 Backend

Rodar fora de sandbox se necessario:

```bash
./gradlew test
./gradlew build
docker build -t backend-orquestrador-local .
```

Critérios:

- [ ] Testes passam.
- [ ] Jar gera.
- [ ] Docker build passa.
- [ ] App sobe apontando para `workestrator_teste`.

### 7.3 Smoke test em producao

Fluxos obrigatorios:

- [ ] Abrir landing em dominio real.
- [ ] Criar conta.
- [ ] Fazer login.
- [ ] Abrir link de share publico sem login.
- [ ] Logar e aceitar share.
- [ ] Baixar release Windows pelo site.
- [ ] Instalar app desktop.
- [ ] Login no app desktop.
- [ ] Rodar um squad simples no app desktop.
- [ ] Publicar nova release pequena.
- [ ] Verificar aviso de update no app instalado.

## Ordem sugerida para executar hoje

1. Sanitizar `.env` e confirmar que nenhum secret real esta versionado.
2. Rotacionar secrets que possam ter vazado.
3. Configurar DNS: `workestrator.zappyon.com` e `workestrator-api.zappyon.com`.
4. Trocar referencias antigas no front e backend para os dominios finais.
5. Ajustar backend env de producao na VPS/GitHub Secrets.
6. Fechar CORS para `https://workestrator.zappyon.com`.
7. Subir backend e validar health/login.
8. Restaurar landing em `/` apenas para web.
9. Migrar rotas privadas para `/dashboard/*` e criar redirects legados de `/orquestrador/*`.
10. Criar `/download` consumindo manifest publico de releases/downloads.
11. Bloquear execucao de runner no browser.
12. Ajustar branding, sitemap e robots.
13. Implementar auto-update Electron.
14. Rodar builds/testes.
15. Publicar release Electron pelo CI.
16. Subir front web.
17. Fazer smoke test completo.
18. Criar CTA/formulario de participacao e ativar branch protection privada.

## Riscos conhecidos

- Se `SECRETS_MASTER_KEY` for trocada depois de dados criptografados, os secrets existentes deixam de abrir.
- Se CORS ficar `*` com cookies, a producao fica permissiva demais.
- Se alguma referencia antiga de API continuar apontando para o dominio do frontend `workestrator.zappyon.com`, builds podem quebrar login/download/update; API deve usar `workestrator-api.zappyon.com`.
- Se `.env` real ja foi commitado, remover arquivo no ultimo commit nao basta; secrets precisam ser rotacionados.
- Auto-update no macOS pode exigir assinatura/notarizacao para experiencia sem alerta de seguranca.
- Se o repositorio ficar privado, a pagina de download nao deve depender de GitHub Releases publico; usar manifest publico ou storage publico para assets.
- Web login com API em subdominio pode exigir ajuste de cookie `SameSite=None; Secure` dependendo da combinacao final de dominio.
- `JPA_DDL_AUTO=update` ajuda hoje, mas para producao madura o ideal e migrar para Flyway/Liquibase.

## Definition of Done geral

O plano esta concluido quando:

- [ ] Site publico abre landing no dominio real.
- [ ] Site publico tem pagina de download funcional.
- [ ] Releases CI aparecem para download.
- [ ] App instalado detecta nova release.
- [ ] Backend esta em HTTPS atras de dominio/subdominio.
- [ ] CORS, cookies e redirects estao fechados para producao.
- [ ] Nenhum secret real esta em Git.
- [ ] Landing tem CTA de participacao no desenvolvimento.
- [ ] Formulario de participacao coleta dados para triagem manual.
- [ ] Repositorios privados exigem PR, CI e aprovacao do mantenedor.
- [ ] Web bloqueia execucao local e direciona para desktop.
- [ ] Electron continua usando o backend de producao no build empacotado.
