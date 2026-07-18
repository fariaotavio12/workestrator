import { AlertTriangle, Bot, Eye } from "lucide-react";
import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { ClipBoard } from "@/components/clip-board/clip-board";
import { DiffViewer } from "@/components/diff-viewer/diff-viewer";
import { Markdown } from "@/components/markdown/markdown";
import { extractHtml } from "@/components/preview/detect";
import { Terminal } from "@/components/terminal/terminal";
import { ThinkingBlock } from "@/components/thinking-block/thinking-block";
import { Typography } from "@/components/typography";
import type { Artifact, CharacterName } from "@/features/security/orchestrator-shared/types";
import { AgentAvatar } from "../agent-avatar";
import { formatAgentArtifactContent } from "./question-artifact";

/** Decide como renderizar o corpo de um turno: terminal (stdout), diff (patch) ou markdown. */
const looksLikeDiff = (text: string): boolean =>
	/^diff --git /m.test(text) || (/^@@ .* @@/m.test(text) && /^[-+]/m.test(text));

export const detectArtifactKind = (content: string, kind?: Artifact["kind"]): "terminal" | "diff" | "markdown" => {
	if (kind === "stdout") return "terminal";
	if (looksLikeDiff(content)) return "diff";
	return "markdown";
};

export type AgentTurnProps = {
	name: string;
	role?: string;
	character?: CharacterName;
	accentColor?: string;
	content?: string;
	/** Raciocínio (ex.: por que o coordenador escolheu este agent) — bloco colapsável. */
	reason?: string;
	artifactKind?: Artifact["kind"];
	streaming?: boolean;
	tone?: "agent" | "error";
	/** Quando o conteúdo tem HTML, mostra "Visualizar HTML" (preview via srcdoc, sem servidor/arquivo). */
	onPreviewHtml?: (html: string) => void;
	className?: string;
};

/** Um turno do transcript: avatar do agent + saída renderizada (markdown/terminal/diff) + copiar. */
export const AgentTurn = ({
	name,
	role,
	character,
	accentColor,
	content,
	reason,
	artifactKind,
	streaming,
	tone = "agent",
	onPreviewHtml,
	className,
}: AgentTurnProps) => {
	const displayContent = content ? formatAgentArtifactContent(content) : undefined;
	const bodyKind = displayContent ? detectArtifactKind(displayContent, artifactKind) : "markdown";
	const html = displayContent && onPreviewHtml ? extractHtml(displayContent) : null;

	return (
		<div className={cn("group flex gap-3", className)}>
			<div className="mt-0.5 shrink-0">
				{tone === "error" ? (
					<span className="bg-destructive/10 text-destructive flex size-7 items-center justify-center rounded-lg">
						<AlertTriangle className="size-4" />
					</span>
				) : character ? (
					<AgentAvatar character={character} accentColor={accentColor} size={28} />
				) : (
					<span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
						<Bot className="size-4" />
					</span>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<Typography variant="title-sm" as="span" className={cn(tone === "error" && "text-destructive")}>
						{name}
					</Typography>
					{role && (
						<Typography variant="caption" className="text-muted-foreground truncate">
							{role}
						</Typography>
					)}
				</div>

				{reason && (
					<ThinkingBlock title="Raciocínio do coordenador" className="mt-1.5">
						{reason}
					</ThinkingBlock>
				)}

				{displayContent && (
					<div className="mt-1.5">
						{bodyKind === "terminal" ? (
							<Terminal content={displayContent} autoScroll={false} />
						) : bodyKind === "diff" ? (
							<DiffViewer patch={displayContent} />
						) : (
							<Markdown content={displayContent} />
						)}
						{streaming && <span className="bg-foreground ml-0.5 inline-block h-4 w-1.5 animate-pulse align-middle" />}
					</div>
				)}

				{html && onPreviewHtml && !streaming && (
					<Button variant="outline" size="sm" className="mt-2" onClick={() => onPreviewHtml(html)}>
						<Eye className="size-4" />
						Visualizar HTML
					</Button>
				)}
			</div>

			{displayContent && !streaming && tone === "agent" && (
				<div className="opacity-0 transition-opacity group-hover:opacity-100">
					<ClipBoard texto={displayContent} variant="ghost" size="icon" className="size-6" />
				</div>
			)}
		</div>
	);
};
