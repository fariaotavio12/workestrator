import { dashboardFallback } from "@/app/assets/fallbacks";
import { AppBrandIcon, appBrand } from "@/app/config/branding";
import { Rotas } from "@/app/routing/variables";
import { CustomLink } from "@/components/link";
import { ChartColumn, ClipboardCheck, Settings2, ShieldCheck } from "lucide-react";
import { Outlet } from "react-router-dom";

const features = [
	{ icon: ChartColumn, label: "Métricas", value: "Tempo real" },
	{ icon: ClipboardCheck, label: "Fluxos", value: "Prontos" },
	{ icon: Settings2, label: "Configuração", value: "Flexível" },
];

export const LayoutAuth = () => {
	return (
		<main className="bg-background flex w-full">
			<div className="flex h-full min-h-screen w-full">
				<div className="flex w-full flex-col lg:w-1/2">
					<CustomLink
						className="text-primary m-4 flex w-fit items-center gap-2 text-xl font-semibold"
						to={Rotas.desprotegidas.landingPages.home}
						variant="link"
						size="link"
					>
						<AppBrandIcon width={42} height={42} />
						{appBrand.shortName}
					</CustomLink>

					<div className="flex flex-1 items-center justify-center px-4 py-8 lg:px-8">
						<Outlet />
					</div>
				</div>

				<div className="bg-sidebar relative hidden w-1/2 overflow-hidden border-l lg:flex lg:flex-col">
					<div className="relative z-10 flex h-full flex-col p-12">
						<div className="flex max-w-md flex-1 flex-col justify-center">
							<div className="border-primary/20 bg-primary/10 text-primary mb-6 flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
								<ShieldCheck size={12} />
								Base web pronta para adaptar
							</div>

							<h2 className="text-foreground mb-4 text-3xl leading-snug font-semibold">
								Construa seu produto.
								<br />
								Mantenha uma base organizada.
							</h2>

							<p className="text-muted-foreground text-sm leading-relaxed">
								Template React com autenticação, rotas, providers, layout administrativo e estrutura por features para
								iniciar novos sistemas sem acoplar regras de um domínio específico.
							</p>

							<div className="mt-8 grid grid-cols-3 gap-3">
								{features.map(({ icon: Icon, label, value }) => (
									<div key={label} className="bg-card rounded-lg border p-3 shadow-sm">
										<Icon size={15} className="text-primary mb-2" />
										<p className="text-sm font-semibold">{value}</p>
										<p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
									</div>
								))}
							</div>
						</div>

						<div className="relative mt-6">
							<div className="bg-card shadow-foreground/10 overflow-hidden rounded-2xl border shadow-xl">
								<div className="bg-muted flex items-center gap-1.5 border-b px-3 py-2">
									<div className="bg-destructive/60 h-2.5 w-2.5 rounded-full" />
									<div className="bg-warning/70 h-2.5 w-2.5 rounded-full" />
									<div className="bg-success/70 h-2.5 w-2.5 rounded-full" />
									<span className="text-muted-foreground ml-2 text-xs">app.workestrator.zappyon.com</span>
								</div>
								<img
									src={dashboardFallback}
									alt={`${appBrand.name} Dashboard`}
									className="max-h-64 w-full object-cover object-top"
								/>
							</div>
							<div className="from-sidebar absolute right-0 bottom-0 left-0 h-16 bg-linear-to-t to-transparent" />
						</div>
					</div>
				</div>
			</div>
		</main>
	);
};
