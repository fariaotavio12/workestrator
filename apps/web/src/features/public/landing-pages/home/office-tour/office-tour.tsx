import { Typography } from "@/components/typography";
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { EndOfVisitCard } from "./end-of-visit-card";
import { AVATAR_SIZE, stations, type Sprite } from "./office-tour-data";
import { OfficeTourStatic } from "./office-tour-static";
import { useOfficeTour } from "./use-office-tour";

const CTA_ANCHOR_ID = "office-tour-cta-entrar";

const SpriteLayer = ({ sprites, style }: { sprites: Sprite[]; style?: CSSProperties }) => (
	<>
		{sprites.map((sprite, i) => (
			<img
				key={i}
				src={sprite.src}
				alt=""
				aria-hidden="true"
				style={{
					position: "absolute",
					left: sprite.left,
					bottom: sprite.bottom,
					width: sprite.width,
					zIndex: sprite.z,
					imageRendering: "pixelated",
					transform: `translateX(-50%)${sprite.flip === -1 ? " scaleX(-1)" : ""}`,
					...style,
				}}
			/>
		))}
	</>
);

/**
 * Hero da home: escritório 2D com scroll horizontal (sticky + parallax). Cai pro fallback estático
 * em `prefers-reduced-motion` — a lógica de layout/scroll vive em `useOfficeTour`.
 */
export const OfficeTour = () => {
	const midRef = useRef<HTMLDivElement>(null);
	const bgRef = useRef<HTMLDivElement>(null);
	const fgRef = useRef<HTMLDivElement>(null);
	const tour = useOfficeTour({ midRef, bgRef, fgRef });

	if (tour.reducedMotion || !tour.world) return <OfficeTourStatic />;

	const { world, viewport, activeIndex, walking, direction, chestOpen, ctaVisible, sound } = tour;
	const pageHeight = world.scrollable + viewport.vh;
	const playerPose = tour.playerPose();
	const playerSrc = tour.avatarSrc("Male1", playerPose, tour.tick);
	const playerWidth = AVATAR_SIZE.Male1[0] * world.scale;
	const ctaLift = Math.round(world.chestWidth * 0.9 + 26);

	return (
		<div id="features" className="w-full" style={{ height: pageHeight, position: "relative" }}>
			<span aria-live="polite" className="sr-only">
				{tour.announcement}
			</span>
			<a
				href={`#${CTA_ANCHOR_ID}`}
				onClick={(event) => {
					event.preventDefault();
					tour.skipToEnd(CTA_ANCHOR_ID);
				}}
				className="bg-card text-foreground border-border focus-visible:ring-primary fixed top-3 left-4 z-[60] -translate-x-[calc(100%+2rem)] rounded-lg border px-4 py-2.5 text-sm font-semibold no-underline focus-visible:translate-x-0 focus-visible:ring-3"
			>
				Pular para o final — Entrar
			</a>

			<div className="sticky top-16 w-full overflow-hidden" style={{ height: "calc(100svh - 4rem)" }}>
				<div className="bg-layout absolute inset-0" />
				<div className="bg-muted border-border absolute inset-x-0 bottom-0 border-t-[3px]" style={{ height: "21%" }} />

				<div ref={bgRef} className="absolute inset-0 z-[1]" style={{ willChange: "transform" }}>
					<SpriteLayer sprites={world.background} style={{ opacity: 0.92 }} />
				</div>

				<div ref={midRef} className="absolute inset-0 z-[2]" style={{ willChange: "transform" }}>
					<div
						className="absolute z-[2] flex flex-col gap-4"
						style={{ left: "6vw", top: "9vh", width: "min(660px,86vw)" }}
					>
						<Typography variant="section-label" className="text-accent-foreground">
							Workestrador — console de squads de agentes
						</Typography>
						<Typography
							variant="display-lg"
							className="m-0"
							style={{ fontSize: "clamp(2.5rem,1.9rem+2.6vw,4.5rem)", lineHeight: 1.06, letterSpacing: "-0.01em" }}
						>
							O Escritório do Orquestrador
						</Typography>
						<Typography variant="body-md" className="text-muted-foreground max-w-[46ch]">
							Monte squads de agentes de IA — Claude, GPT, Gemini ou modelos locais — num escritório que roda
							inteiro no seu navegador. Aqui, quem coordena é um agente também.
						</Typography>
						<div className="mt-1.5 flex items-center gap-2.5">
							<span aria-hidden="true" className="text-primary animate-[wkhint_1.3s_ease-in-out_infinite] text-base font-semibold">
								→
							</span>
							<Typography variant="caption" className="text-muted-foreground font-mono">
								role para caminhar · ou use ← →
							</Typography>
						</div>
					</div>

					<SpriteLayer sprites={world.furniture} />

					{stations.map((station, i) => {
						const isPlayerStation = station.isPlayerStation;
						const isActive = activeIndex === i && (i > 0 || tour.scrolled);
						return (
							<div
								key={station.num}
								data-screen-label={`${station.num} — ${station.label}`}
								className="absolute z-[8] flex flex-col items-center gap-3"
								style={{ bottom: "19.6%", left: world.xs[i], transform: "translateX(-50%)", width: "min(330px,78vw)" }}
							>
								<div
									className="bg-card border-border rounded-2xl border p-4 text-center shadow-lg"
									style={{
										visibility: isActive ? "visible" : "hidden",
										opacity: isActive ? 1 : 0,
										transform: `translateY(${isActive ? 0 : 10}px)`,
										transition: "opacity .25s ease, transform .25s ease",
									}}
								>
									<Typography variant="title-sm">{station.quote}</Typography>
									<Typography variant="body-sm" className="text-muted-foreground mt-1.5">
										{station.subtitle}
									</Typography>
								</div>
								{!isPlayerStation && (
									<img
										src={tour.avatarSrc(station.avatar, tour.poseFor(i), tour.tick)}
										alt=""
										aria-hidden="true"
										style={{
											width: AVATAR_SIZE[station.avatar][0] * world.scale,
											imageRendering: "pixelated",
											transform: `scaleX(${i === world.lastIndex ? -1 : 1})`,
										}}
									/>
								)}
								{isPlayerStation && <div style={{ height: Math.round(50 * world.scale) }} />}
							</div>
						);
					})}

					<div
						style={{
							position: "absolute",
							left: world.chestLeft,
							bottom: "20.4%",
							zIndex: 6,
							width: world.chestWidth,
							transform: "translateX(-50%)",
						}}
					>
						<div aria-hidden="true" style={{ position: "relative", width: world.chestWidth }}>
							<span
								className="bg-yellow animate-[wkspark_1.6s_ease-out_infinite]"
								style={{ position: "absolute", left: "16%", top: -8, width: 6, height: 6, display: chestOpen ? "block" : "none" }}
							/>
							<span
								className="bg-gold animate-[wkspark_1.9s_ease-out_infinite]"
								style={{ position: "absolute", left: "52%", top: -14, width: 7, height: 7, animationDelay: "0.4s", display: chestOpen ? "block" : "none" }}
							/>
							<span
								className="bg-yellow animate-[wkspark_1.5s_ease-out_infinite]"
								style={{ position: "absolute", left: "80%", top: -6, width: 5, height: 5, animationDelay: "0.8s", display: chestOpen ? "block" : "none" }}
							/>
						</div>
						<img
							src={`/assets/furniture/treasurechest_${chestOpen ? "open" : "closed"}_gold.png`}
							alt="Baú dourado — objetivo final"
							style={{
								width: world.chestWidth,
								imageRendering: "pixelated",
								animation: chestOpen ? "wkpop .5s ease" : "none",
							}}
						/>
					</div>

					<div
						style={{
							position: "absolute",
							left: world.chestLeft,
							bottom: `calc(20.4% + ${ctaLift}px)`,
							zIndex: 9,
							transform: "translateX(-50%)",
							visibility: ctaVisible ? "visible" : "hidden",
							opacity: ctaVisible ? 1 : 0,
							transition: "opacity .4s ease",
							width: "min(360px,84vw)",
						}}
						className="bg-card border-border rounded-3xl border p-6 shadow-lg"
					>
						<EndOfVisitCard entrarId={CTA_ANCHOR_ID} />
					</div>
				</div>

				<div
					style={{
						position: "absolute",
						left: activeIndex === 0 ? "42%" : "29%",
						bottom: "19%",
						zIndex: 9,
						width: playerWidth,
						transform: "translateX(-50%)",
						transition: "left .45s ease",
					}}
				>
					<div style={{ animation: walking ? "wkbob .34s steps(2,end) infinite" : "none" }}>
						<img
							src={playerSrc}
							alt="Orquestrador — personagem jogável"
							style={{
								width: playerWidth,
								imageRendering: "pixelated",
								transform: `scaleX(${direction < 0 ? -1 : 1})`,
								display: "block",
							}}
						/>
					</div>
					<div aria-hidden="true" className="bg-foreground/10 mx-auto mt-0.5" style={{ width: "70%", height: 7, borderRadius: "50%" }} />
				</div>

				<div ref={fgRef} className="pointer-events-none absolute inset-0 z-[15]" style={{ willChange: "transform" }}>
					<SpriteLayer sprites={world.foreground} style={{ filter: "brightness(.94)" }} />
				</div>

				<div className="absolute inset-x-0 top-0 z-40 flex items-center justify-end px-4 py-3.5">
					<button
						type="button"
						onClick={tour.toggleSound}
						aria-label={sound ? "Desligar efeitos sonoros" : "Ligar efeitos sonoros"}
						className="bg-card/85 border-border hover:bg-muted rounded-lg border px-3.5 py-2.5 font-mono text-[11px] font-semibold tracking-wider backdrop-blur-sm"
					>
						{sound ? <Volume2 className="inline size-3.5" /> : <VolumeX className="inline size-3.5" />} {sound ? "SOM ON" : "SOM OFF"}
					</button>
				</div>

				<button
					type="button"
					onClick={() => tour.goTo(activeIndex - 1)}
					aria-label="Estação anterior"
					disabled={activeIndex === 0}
					className="bg-card/85 border-border hover:bg-muted absolute top-1/2 left-2.5 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg border disabled:opacity-45"
				>
					<ChevronLeft className="size-5" />
				</button>
				<button
					type="button"
					onClick={() => tour.goTo(activeIndex + 1)}
					aria-label="Próxima estação"
					disabled={activeIndex === world.lastIndex}
					className="bg-card/85 border-border hover:bg-muted absolute top-1/2 right-2.5 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg border disabled:opacity-45"
				>
					<ChevronRight className="size-5" />
				</button>

				<div className="bg-card/85 border-border absolute bottom-3.5 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-3xl border px-3.5 py-2.5 backdrop-blur-sm">
					<Typography variant="caption" className="text-muted-foreground font-mono">
						{stations[activeIndex].num} — {stations[activeIndex].label}
					</Typography>
					<div className="flex gap-1" role="group" aria-label="Estações da visita">
						{stations.map((station, i) => (
							<button
								key={station.num}
								type="button"
								onClick={() => tour.goTo(i)}
								aria-label={`Ir para a estação ${station.num} — ${station.label}`}
								className="flex items-center px-0.5 py-2"
							>
								<span
									className="block rounded-full transition-[width,background-color] duration-200"
									style={{
										width: activeIndex === i ? 30 : 14,
										height: 7,
										backgroundColor: activeIndex === i ? `var(--${station.accent})` : "var(--border)",
									}}
								/>
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
