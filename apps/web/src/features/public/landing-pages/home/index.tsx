import { dashboardLightFallback } from "@/app/assets/fallbacks";
import { appBrand } from "@/app/config/branding";
import { Rotas } from "@/app/routing/variables";
import { Badge } from "@/components";
import { CustomLink } from "@/components/link";
import { Typography } from "@/components/typography";
import { ArrowRight, Bot, Boxes, Cpu, History, ShieldCheck, Terminal, Workflow } from "lucide-react";
import { useLocation } from "react-router-dom";

const highlights = [
	{
		icon: Boxes,
		label: "Squads",
		title: "Um escritório por squad",
		description: "Monte um squad e sente cada agent numa cadeira — todos prontos pra trabalhar juntos numa tarefa.",
	},
	{
		icon: Workflow,
		label: "Orchestrator",
		title: "Um coordenador decide o próximo passo",
		description:
			"A cada passo, o coordenador escolhe qual agent age a seguir, até a tarefa terminar ou bater o limite.",
	},
	{
		icon: ShieldCheck,
		label: "Checkpoints",
		title: "Aprovação antes de agir",
		description: "Marque agents que exigem sua aprovação antes de rodar — nada acontece sem você revisar.",
	},
];

const included = [
	{
		icon: Cpu,
		label: "Modelos",
		title: "Conecte qualquer provider",
		description: "CLI local (Claude, Codex, GPT) ou API externa — cada agent escolhe seu próprio modelo.",
	},
	{
		icon: Terminal,
		label: "Scripts",
		title: "Ferramentas reutilizáveis",
		description: "Uma biblioteca de comandos e scripts que qualquer agent pode referenciar como ferramenta.",
	},
	{
		icon: History,
		label: "Execuções",
		title: "Histórico de cada run",
		description: "Acompanhe o que rodou, o que cada agent perguntou e reveja o resultado depois.",
	},
	{
		icon: Bot,
		label: "Agents",
		title: "Identidade e comportamento",
		description: "Nome, papel, prompt, personagem e regras de execução — tudo configurável por agent.",
	},
];

const flowItems = ["Squads", "Agents", "Modelos", "Scripts", "Execuções", "Checkpoints"];

export const HomePage = () => {
	const location = useLocation();
	const returnState = location.state as { from?: string } | null;
	const loginState = returnState?.from ? { from: returnState.from } : undefined;

	return (
		<div className="flex w-full flex-col">
			<section className="w-full border-b">
				<div className="mx-auto flex min-h-[calc(100vh-3.75rem)] w-full max-w-7xl flex-col justify-between gap-12 px-5 py-16 md:px-10 lg:px-20 lg:py-24">
					<div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
						<div className="flex max-w-4xl flex-col gap-8">
							<Typography variant="caption" className="text-primary">
								{appBrand.name} / Orquestrador de squads de agentes de IA
							</Typography>
							<Typography variant="display-xl" className="text-foreground max-w-4xl">
								Monte squads de agentes de IA e rode com um clique.
							</Typography>
						</div>

						<div className="flex flex-col gap-8 lg:pb-2">
							<Typography variant="body-md" className="text-muted-foreground max-w-xl">
								Configure agents, conecte os modelos, dê ferramentas e deixe o coordenador decidir quem age em cada
								passo — tudo rodando na sua máquina, com o histórico de cada execução guardado.
							</Typography>
							<div className="flex flex-col gap-3 sm:flex-row">
								<CustomLink to={Rotas.desprotegidas.landingPages.download}>
									Baixar desktop
									<ArrowRight className="size-4" />
								</CustomLink>
								<CustomLink to={Rotas.desprotegidas.auth.login} state={loginState} variant="outline">
									Entrar
								</CustomLink>
								<CustomLink to={Rotas.desprotegidas.landingPages.explore} variant="ghost">
									Explorar recursos
								</CustomLink>
								<CustomLink to={Rotas.desprotegidas.landingPages.participate} variant="ghost">
									Sugerir melhoria
								</CustomLink>
							</div>
						</div>
					</div>

					<div className="bg-card overflow-hidden rounded-lg border">
						<div className="bg-muted grid border-b px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
							<Typography variant="caption" className="text-muted-foreground">
								Product preview
							</Typography>
							<Typography variant="caption" className="text-primary">
								Squads / Escritório de agentes / Execução ao vivo
							</Typography>
						</div>
						<img src={dashboardLightFallback} alt={`Preview do dashboard do ${appBrand.name}`} className="w-full" />
					</div>
				</div>
			</section>

			<section id="features" className="w-full border-b">
				<div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-20 lg:py-24">
					<div className="flex max-w-xl flex-col gap-5">
						<Typography variant="caption" className="text-primary">
							Features
						</Typography>
						<Typography variant="display-md">Do briefing ao resultado, sem sair do escritório.</Typography>
						<Typography variant="body-md" className="text-muted-foreground">
							Um squad é um time de agentes com papéis, modelos e ferramentas próprios — você descreve a tarefa e
							acompanha a execução em tempo real.
						</Typography>
					</div>

					<div className="grid gap-0 border-t">
						{highlights.map(({ icon: Icon, label, title, description }) => (
							<article key={title} className="grid gap-4 border-b py-6 sm:grid-cols-[9rem_1fr] sm:gap-8">
								<Typography variant="caption" className="text-primary">
									{label}
								</Typography>
								<div className="grid gap-4 sm:grid-cols-[1fr_auto]">
									<div className="flex flex-col gap-2">
										<Typography variant="title-lg">{title}</Typography>
										<Typography variant="body-md" className="text-muted-foreground max-w-xl">
											{description}
										</Typography>
									</div>
									<div className="bg-muted text-primary flex size-11 items-center justify-center rounded-full border">
										<Icon className="size-5" />
									</div>
								</div>
							</article>
						))}
					</div>
				</div>
			</section>

			<section id="included" className="bg-muted w-full border-b">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-16 md:px-10 lg:px-20 lg:py-24">
					<div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
						<div className="flex flex-col gap-5">
							<Typography variant="caption" className="text-primary">
								Included
							</Typography>
							<Typography variant="display-md">Tudo que um squad precisa pra rodar de verdade.</Typography>
						</div>
						<Typography variant="body-md" className="text-muted-foreground max-w-xl lg:justify-self-end">
							Modelos, ferramentas e histórico ficam centralizados — cada squad novo só escolhe o que já está
							cadastrado.
						</Typography>
					</div>

					<div className="grid border-t md:grid-cols-2">
						{included.map(({ icon: Icon, label, title, description }) => (
							<article
								key={title}
								className="flex min-h-52 flex-col justify-between gap-8 border-b p-6 md:border-r md:even:border-r-0"
							>
								<div className="flex items-center justify-between gap-4">
									<Typography variant="caption" className="text-primary">
										{label}
									</Typography>
									<Icon className="text-muted-foreground size-5" />
								</div>
								<div className="flex flex-col gap-2">
									<Typography variant="title-lg">{title}</Typography>
									<Typography variant="body-md" className="text-muted-foreground">
										{description}
									</Typography>
								</div>
							</article>
						))}
					</div>
				</div>
			</section>

			<section id="stack" className="w-full">
				<div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 md:px-10 lg:grid-cols-[0.75fr_1.25fr] lg:px-20 lg:py-24">
					<div className="flex flex-col gap-5">
						<Typography variant="caption" className="text-primary">
							Como funciona
						</Typography>
						<Typography variant="display-md">Um fluxo simples, do brief ao resultado.</Typography>
					</div>
					<div className="flex flex-col gap-8">
						<div className="flex flex-wrap gap-2">
							{flowItems.map((item) => (
								<Badge key={item} variant="secondary">
									{item}
								</Badge>
							))}
						</div>
						<CustomLink to={Rotas.desprotegidas.landingPages.download} variant="outline" className="w-fit">
							Baixar desktop
							<ArrowRight className="size-4" />
						</CustomLink>
						<CustomLink to={Rotas.desprotegidas.landingPages.participate} variant="link" size="link" className="w-fit">
							Enviar uma melhoria
							<ArrowRight className="size-4" />
						</CustomLink>
					</div>
				</div>
			</section>
		</div>
	);
};
