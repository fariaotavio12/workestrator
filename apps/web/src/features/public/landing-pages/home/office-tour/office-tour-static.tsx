import { Typography } from "@/components/typography";
import { EndOfVisitCard } from "./end-of-visit-card";
import { stations } from "./office-tour-data";

/** Fallback acessível: sem scroll horizontal nem parallax, pra `prefers-reduced-motion` e leitores de tela. */
export const OfficeTourStatic = () => (
	<div id="features" className="mx-auto flex w-full max-w-2xl flex-col gap-11 px-5 py-16 md:px-10">
		<div className="flex flex-col gap-3">
			<Typography variant="section-label" className="text-accent-foreground">
				Console de squads de agentes
			</Typography>
			<Typography variant="display-lg">O Escritório do Orquestrador</Typography>
			<Typography variant="body-md" className="text-muted-foreground max-w-xl">
				Monte squads de agentes de IA — Claude, GPT, Gemini ou modelos locais — num escritório que roda inteiro no
				seu navegador. Aqui, quem coordena é um agente também.
			</Typography>
		</div>

		<ol className="relative flex flex-col gap-8">
			{stations.map((station, i) => (
				<li
					key={station.num}
					aria-label={`${station.num} — ${station.label}`}
					className="relative flex gap-4 pl-1 sm:gap-5"
				>
					<div className="relative flex flex-col items-center">
						<span
							className="border-border bg-card z-[1] flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold shadow-sm"
							style={{ color: `var(--${station.accent})` }}
							aria-hidden="true"
						>
							{station.num}
						</span>
						{i < stations.length - 1 && (
							<span className="bg-border absolute top-9 bottom-[-2rem] w-px" aria-hidden="true" />
						)}
					</div>

					<div className="flex flex-1 flex-col gap-3 pb-1">
						<Typography variant="section-label" className="text-muted-foreground">
							{station.label}
						</Typography>
						<div className="flex items-end gap-4">
							<img
								src={`/assets/avatars/${station.avatar}_talk.png`}
								alt={`Agente da estação ${station.label}`}
								className="w-[68px] shrink-0"
								style={{ imageRendering: "pixelated" }}
							/>
							<div className="bg-card border-border flex-1 rounded-2xl border p-4 shadow-sm">
								<Typography variant="title-sm">{station.quote}</Typography>
								<Typography variant="body-sm" className="text-muted-foreground mt-1.5">
									{station.subtitle}
								</Typography>
							</div>
						</div>
					</div>
				</li>
			))}
		</ol>

		<div className="bg-card border-border rounded-3xl border p-7">
			<EndOfVisitCard />
		</div>
	</div>
);
