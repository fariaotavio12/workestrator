import {
	Button,
	FieldWrapper,
	Input,
	KeyValueEditor,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
	Typography,
} from "@/components";
import type { ScriptFormValues, ToolTemplate } from "@/features/security/scripts/data/tool-templates";
import type { ConnectorProvider, HttpMethod, McpTransport } from "@/features/security/orchestrator-shared/types";
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useWatch } from "react-hook-form";

const LANGUAGE_LABEL = { bash: "Bash", node: "Node.js", python: "Python" } as const;
const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const MCP_TRANSPORTS: McpTransport[] = ["stdio", "http"];
const MCP_TRANSPORT_LABEL: Record<McpTransport, string> = { stdio: "Local (stdio)", http: "Remoto (HTTP)" };
const CONNECTOR_PROVIDERS: ConnectorProvider[] = ["composio", "zapier", "n8n", "youtube"];
const CONNECTOR_PROVIDER_LABEL: Record<ConnectorProvider, string> = {
	composio: "Composio",
	zapier: "Zapier",
	n8n: "n8n",
	youtube: "YouTube",
};

type StepConfigureProps = {
	template: ToolTemplate;
	control: Control<ScriptFormValues>;
	errors: FieldErrors<ScriptFormValues>;
	register: UseFormRegister<ScriptFormValues>;
	setValue: UseFormSetValue<ScriptFormValues>;
};

/** Passo 2 do wizard — só os campos do template escolhido, com exemplo/ajuda inline. */
export const StepConfigure = ({ template, control, errors, register, setValue }: StepConfigureProps) => {
	const kind = template.kind;
	const language = useWatch({ control, name: "language" });
	const method = useWatch({ control, name: "method" });
	const transport = useWatch({ control, name: "transport" });
	const connectorProvider = useWatch({ control, name: "connectorProvider" });
	const headers = useWatch({ control, name: "headers" });
	const env = useWatch({ control, name: "env" });
	const configRecord = useWatch({ control, name: "configRecord" });

	return (
		<div className="flex flex-col gap-4">
			<Input label="Nome" placeholder="Ex.: Rodar testes" error={errors.name?.message} {...register("name")} />
			<Input label="Descrição (opcional)" placeholder="O que essa ferramenta faz" {...register("description")} />

			{kind === "command" && (
				<div className="grid gap-4 sm:grid-cols-2">
					<Input label="Comando" placeholder="Ex.: npm" error={errors.command?.message} {...register("command")} />
					<Input label="Args (separados por espaço)" placeholder="Ex.: run test" {...register("args")} />
				</div>
			)}

			{kind === "file" && (
				<FieldWrapper
					label="Caminho"
					description="Lido ao vivo na máquina do runner — só providers locais (claude-cli) conseguem resolver."
					error={errors.path?.message}
				>
					<div className="flex gap-2">
						<Input placeholder="Ex.: /home/user/projeto/scripts/deploy.sh" className="flex-1" {...register("path")} />
						{window.__ORCH_API__?.selectPath && (
							<Button
								type="button"
								variant="outline"
								onClick={async () => {
									const selected = await window.__ORCH_API__?.selectPath();
									if (selected) setValue("path", selected, { shouldValidate: true });
								}}
							>
								Selecionar...
							</Button>
						)}
					</div>
				</FieldWrapper>
			)}

			{kind === "inline" && (
				<>
					<FieldWrapper label="Linguagem">
						<Select
							value={language}
							onValueChange={(v) => setValue("language", v as ScriptFormValues["language"], { shouldValidate: true })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(LANGUAGE_LABEL) as (keyof typeof LANGUAGE_LABEL)[]).map((lang) => (
									<SelectItem key={lang} value={lang}>
										{LANGUAGE_LABEL[lang]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldWrapper>
					<Textarea
						label="Conteúdo do script"
						description="Materializado em arquivo só quando um agent com 'Pode executar scripts' o usar."
						rows={10}
						className="font-mono text-xs"
						error={errors.content?.message}
						{...register("content")}
					/>
				</>
			)}

			{kind === "http" && (
				<>
					<div className="grid gap-4 sm:grid-cols-[140px_1fr]">
						<FieldWrapper label="Método">
							<Select value={method} onValueChange={(v) => setValue("method", v as HttpMethod, { shouldValidate: true })}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{HTTP_METHODS.map((m) => (
										<SelectItem key={m} value={m}>
											{m}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FieldWrapper>
						<Input
							label="URL"
							placeholder="Ex.: https://api.exemplo.com/v1/recurso/{{id}}"
							description="Aceita placeholders {{variavel}} preenchidos na chamada."
							error={errors.urlTemplate?.message}
							{...register("urlTemplate")}
						/>
					</div>
					<KeyValueEditor
						label="Headers (opcional)"
						keyPlaceholder="Ex.: Content-Type"
						valuePlaceholder="Ex.: application/json"
						addLabel="Adicionar header"
						value={headers}
						onChange={(next) => setValue("headers", next, { shouldValidate: true })}
					/>
					<Textarea
						label="Schema do body (opcional)"
						description="Documentação livre do payload esperado — usada pra descrever a tool ao agent."
						rows={4}
						className="font-mono text-xs"
						{...register("bodySchema")}
					/>
					<Textarea
						label="Mapeamento da resposta (opcional)"
						description="Como extrair o resultado relevante da resposta da API."
						rows={3}
						className="font-mono text-xs"
						{...register("responseMap")}
					/>
				</>
			)}

			{kind === "mcp" && (
				<>
					<FieldWrapper label="Transporte">
						<Select
							value={transport}
							onValueChange={(v) => setValue("transport", v as McpTransport, { shouldValidate: true })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MCP_TRANSPORTS.map((t) => (
									<SelectItem key={t} value={t}>
										{MCP_TRANSPORT_LABEL[t]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldWrapper>

					{transport === "stdio" && (
						<div className="grid gap-4 sm:grid-cols-2">
							<Input label="Comando" placeholder="Ex.: npx" error={errors.command?.message} {...register("command")} />
							<Input
								label="Args (separados por espaço)"
								placeholder="Ex.: -y @modelcontextprotocol/server-github"
								{...register("args")}
							/>
						</div>
					)}

					{transport === "http" && (
						<>
							<Input label="URL" placeholder="Ex.: https://mcp.exemplo.com" error={errors.url?.message} {...register("url")} />
							<KeyValueEditor
								label="Headers (opcional)"
								keyPlaceholder="Ex.: Authorization"
								valuePlaceholder="Ex.: Bearer ..."
								addLabel="Adicionar header"
								value={headers}
								onChange={(next) => setValue("headers", next, { shouldValidate: true })}
							/>
						</>
					)}

					<KeyValueEditor
						label="Variáveis de ambiente (opcional)"
						keyPlaceholder="Ex.: NODE_ENV"
						valuePlaceholder="Ex.: production"
						addLabel="Adicionar variável"
						value={env}
						onChange={(next) => setValue("env", next, { shouldValidate: true })}
					/>
					<Input
						label="Whitelist de tools (separadas por vírgula, opcional)"
						description="Deixe vazio pra expor todas as tools do servidor — restrinja pra controlar o orçamento de contexto."
						placeholder="Ex.: search, get_metadata"
						{...register("toolAllowlist")}
					/>
				</>
			)}

			{kind === "connector" && template.id !== "youtube" && (
				<>
					<FieldWrapper label="Provider" error={errors.connectorProvider?.message}>
						<Select
							value={connectorProvider}
							onValueChange={(v) => setValue("connectorProvider", v as ConnectorProvider, { shouldValidate: true })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CONNECTOR_PROVIDERS.map((p) => (
									<SelectItem key={p} value={p}>
										{CONNECTOR_PROVIDER_LABEL[p]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldWrapper>
					<KeyValueEditor
						label="Config (opcional)"
						description='Ex.: chave "gatewayUrl", valor a URL do gateway MCP remoto (Composio/Zapier/n8n).'
						keyPlaceholder="Ex.: gatewayUrl"
						valuePlaceholder="Ex.: https://gateway.composio.dev/..."
						addLabel="Adicionar campo"
						value={configRecord}
						onChange={(next) => setValue("configRecord", next, { shouldValidate: true })}
					/>
				</>
			)}

			{template.help?.note && (
				<Typography variant="caption" className="text-muted-foreground">
					{template.help.note}
				</Typography>
			)}
		</div>
	);
};
