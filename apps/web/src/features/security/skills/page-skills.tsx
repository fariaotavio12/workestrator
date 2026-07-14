import { Rotas } from "@/app/routing/variables";
import { Badge, BlockEditor, Button, Markdown, PageHeader, Switch, Typography } from "@/components";
import { useCreateExploreAsset } from "@/features/public/explore/api";
import { skillTemplates, type SkillTemplate } from "@/features/security/skills/data/skill-templates";
import { Eye, Globe2, Lock, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const buildAssistantUrl = (skill: SkillTemplate) => {
	const prompt = `Use esta skill como contexto para me ajudar:\n\n${skill.content}\n\nMinha tarefa: `;
	return `${Rotas.protegidas.orchestrator.assistant}?prompt=${encodeURIComponent(prompt)}`;
};

export const PageSkills = () => {
	const navigate = useNavigate();
	const createAsset = useCreateExploreAsset();
	const [skills, setSkills] = useState<SkillTemplate[]>(skillTemplates);
	const [selectedSkillId, setSelectedSkillId] = useState(skillTemplates[0]?.id ?? "");
	const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) ?? skills[0];

	const selectedTags = useMemo(() => selectedSkill?.tags ?? [], [selectedSkill]);

	const updateSelectedSkill = (next: Partial<SkillTemplate>) => {
		if (!selectedSkill) return;
		setSkills((current) => current.map((skill) => (skill.id === selectedSkill.id ? { ...skill, ...next } : skill)));
	};

	const saveSelectedSkill = () => {
		if (!selectedSkill) return;

		createAsset.mutate({
			kind: "SKILL",
			title: selectedSkill.name,
			description: selectedSkill.description,
			tags: selectedSkill.tags,
			visibility: selectedSkill.visibility === "public" ? "PUBLIC" : "PRIVATE",
			payload: {
				format: "markdown",
				content: selectedSkill.content,
				source: "skills-workspace",
			},
		});
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				eyebrow="Workspace"
				title="Skills"
				description="Crie e edite skills em Markdown, salve no backend e publique quando fizer sentido compartilhar."
				actions={
					selectedSkill ? (
						<Button type="button" onClick={() => navigate(buildAssistantUrl(selectedSkill))}>
							<Sparkles />
							Usar no assistente
						</Button>
					) : null
				}
			/>

			<section className="grid min-h-[calc(100vh-12rem)] gap-4 px-4 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
				<aside className="bg-background flex min-h-0 flex-col rounded-lg border">
					<div className="border-b p-4">
						<Typography variant="title-sm">Biblioteca</Typography>
						<Typography variant="caption" className="text-muted-foreground">
							Templates iniciais para autoria.
						</Typography>
					</div>
					<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
						{skills.map((skill) => {
							const selected = skill.id === selectedSkill?.id;
							const VisibilityIcon = skill.visibility === "public" ? Globe2 : Lock;

							return (
								<button
									key={skill.id}
									type="button"
									onClick={() => setSelectedSkillId(skill.id)}
									className={[
										"hover:bg-muted/50 rounded-lg border p-3 text-left transition",
										selected ? "border-foreground/30 bg-muted" : "bg-background",
									].join(" ")}
								>
									<div className="flex items-start gap-2">
										<VisibilityIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
										<div className="min-w-0 flex-1">
											<Typography variant="body-sm" className="truncate font-medium">
												{skill.name}
											</Typography>
											<Typography variant="caption" className="text-muted-foreground line-clamp-2">
												{skill.description}
											</Typography>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</aside>

				<main className="bg-background flex min-h-0 flex-col overflow-hidden rounded-lg border">
					<div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
						<div className="min-w-0">
							<Typography variant="title-sm">{selectedSkill?.name ?? "Skill"}</Typography>
							<Typography variant="caption" className="text-muted-foreground">
								Editor visual com saida em Markdown.
							</Typography>
						</div>
						<div className="flex items-center gap-2">
							<Typography variant="caption" className="text-muted-foreground">
								Publica
							</Typography>
							<Switch
								checked={selectedSkill?.visibility === "public"}
								onCheckedChange={(checked) => updateSelectedSkill({ visibility: checked ? "public" : "private" })}
							/>
							<Button type="button" variant="outline" size="sm" disabled={createAsset.isPending} onClick={saveSelectedSkill}>
								<Save />
								{createAsset.isPending ? "Salvando..." : "Salvar"}
							</Button>
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<BlockEditor
							value={selectedSkill?.content ?? ""}
							onChange={(content) => updateSelectedSkill({ content })}
						/>
					</div>
				</main>

				<aside className="bg-background hidden min-h-0 flex-col overflow-hidden rounded-lg border xl:flex">
					<div className="border-b p-4">
						<div className="flex items-center gap-2">
							<Eye className="size-4" />
							<Typography variant="title-sm">Preview</Typography>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							{selectedTags.map((tag) => (
								<Badge key={tag} variant="outline" className="px-2 py-1">
									{tag}
								</Badge>
							))}
						</div>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<Markdown content={selectedSkill?.content ?? ""} />
					</div>
				</aside>
			</section>
		</div>
	);
};
