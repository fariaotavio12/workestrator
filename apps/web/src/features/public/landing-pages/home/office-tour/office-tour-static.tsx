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

		{stations.map((station) => (
			<section key={station.num} aria-label={`${station.num} — ${station.label}`} className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<span
						className="block size-2.5 rounded-full"
						style={{ backgroundColor: `var(--${station.accent})` }}
						aria-hidden="true"
					/>
					<Typography variant="section-label" className="text-muted-foreground">
						{station.num} — {station.label}
					</Typography>
				</div>
				<div className="flex items-end gap-4">
					<img
						src={`/assets/avatars/${station.avatar}_talk.png`}
						alt={`Agente da estação ${station.label}`}
						className="w-[76px] shrink-0"
						style={{ imageRendering: "pixelated" }}
					/>
					<div className="bg-card border-border rounded-2xl border p-4 shadow-sm">
						<Typography variant="title-sm">{station.quote}</Typography>
						<Typography variant="body-sm" className="text-muted-foreground mt-1.5">
							{station.subtitle}
						</Typography>
					</div>
				</div>
			</section>
		))}

		<div className="bg-card border-border rounded-3xl border p-7">
			<EndOfVisitCard />
		</div>
	</div>
);
