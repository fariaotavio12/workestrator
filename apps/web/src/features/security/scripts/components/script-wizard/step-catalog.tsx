import { cn } from "@/app/utils/cn";
import { Card, CardContent, Typography } from "@/components";
import { TOOL_TEMPLATES, type ToolTemplate } from "@/features/security/scripts/data/tool-templates";

type StepCatalogProps = {
	onSelect: (template: ToolTemplate) => void;
};

// Card em formato de linha (ícone + nome + descrição num único bloco compacto) em vez de um quadrado
// alto — com 8 opções no catálogo, uma linha por item cabe tudo sem precisar rolar a tela.
const TemplateCard = ({ template, onSelect }: { template: ToolTemplate; onSelect: (t: ToolTemplate) => void }) => {
	const Icon = template.icon;
	return (
		<Card className={cn("hover:border-ring", template.featured && "border-primary/40")}>
			<CardContent className="p-0">
				<button
					type="button"
					onClick={() => onSelect(template)}
					className="flex w-full items-center gap-3 p-3 text-left"
				>
					<span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
						<Icon className="size-4" />
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<Typography variant="title-sm" className="truncate">
								{template.label}
							</Typography>
							{template.featured && (
								<span className="bg-primary/10 text-primary shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
									Popular
								</span>
							)}
						</div>
						<Typography variant="caption" className="text-muted-foreground truncate">
							{template.description}
						</Typography>
					</div>
				</button>
			</CardContent>
		</Card>
	);
};

/** Passo 1 do wizard — grid de cards por intenção ("o que você quer habilitar"), não por `kind` técnico. */
export const StepCatalog = ({ onSelect }: StepCatalogProps) => {
	const ready = TOOL_TEMPLATES.filter((t) => t.category === "ready");
	const scratch = TOOL_TEMPLATES.filter((t) => t.category === "scratch");

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Typography variant="caption" className="text-muted-foreground mb-1.5">
					Ferramentas prontas
				</Typography>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{ready.map((template) => (
						<TemplateCard key={template.id} template={template} onSelect={onSelect} />
					))}
				</div>
			</div>

			<div>
				<Typography variant="caption" className="text-muted-foreground mb-1.5">
					Do zero
				</Typography>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{scratch.map((template) => (
						<TemplateCard key={template.id} template={template} onSelect={onSelect} />
					))}
				</div>
			</div>
		</div>
	);
};
