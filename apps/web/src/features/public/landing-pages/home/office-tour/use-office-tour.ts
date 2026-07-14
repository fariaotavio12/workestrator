import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { avatarSrc, buildWorld, stations, type AvatarPose } from "./office-tour-data";

const PIXEL_SCALE = 3;
const SOUND_STORAGE_KEY = "wk_office_tour_sound";

const readStoredSound = () => {
	try {
		const stored = localStorage.getItem(SOUND_STORAGE_KEY);
		return stored === null ? true : stored === "1";
	} catch {
		return true;
	}
};

type AudioNote = "step" | "blip" | "fanfare";

/** Sintetiza bipes curtos via Web Audio API — sem assets de áudio, tudo gerado em runtime. */
const useChiptuneSfx = (enabled: boolean) => {
	const ctxRef = useRef<AudioContext | null>(null);

	const resume = useCallback(() => {
		if (!ctxRef.current) {
			const AudioCtor =
				window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!AudioCtor) return null;
			ctxRef.current = new AudioCtor();
		}
		if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
		return ctxRef.current;
	}, []);

	useEffect(() => {
		const gesture = () => resume();
		window.addEventListener("pointerdown", gesture);
		return () => window.removeEventListener("pointerdown", gesture);
	}, [resume]);

	const play = useCallback(
		(note: AudioNote) => {
			if (!enabled) return;
			const ctx = ctxRef.current;
			if (!ctx || ctx.state !== "running") return;

			const tone = (freq: number, delay: number, duration: number, volume: number) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "square";
				osc.frequency.value = freq;
				gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
				gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(ctx.currentTime + delay);
				osc.stop(ctx.currentTime + delay + duration + 0.02);
			};

			if (note === "step") tone(140 + Math.random() * 50, 0, 0.045, 0.02);
			if (note === "blip") {
				tone(523, 0, 0.07, 0.045);
				tone(784, 0.08, 0.09, 0.045);
			}
			if (note === "fanfare") [523, 659, 784, 1047].forEach((freq, i) => tone(freq, i * 0.11, 0.15, 0.055));
		},
		[enabled],
	);

	return { play, resume };
};

type OfficeTourLayerRefs = {
	midRef: RefObject<HTMLDivElement | null>;
	bgRef: RefObject<HTMLDivElement | null>;
	fgRef: RefObject<HTMLDivElement | null>;
};

/** Refs de DOM (camadas de parallax) ficam de posse do componente — o hook só as recebe pra mover no scroll. */
export const useOfficeTour = ({ midRef, bgRef, fgRef }: OfficeTourLayerRefs) => {
	const reducedMotion = Boolean(useReducedMotion());

	const [sound, setSound] = useState(readStoredSound);
	const [viewport, setViewport] = useState({ vw: window.innerWidth, vh: window.innerHeight, ready: true });
	const [activeIndex, setActiveIndex] = useState(0);
	const [walking, setWalking] = useState(false);
	const [direction, setDirection] = useState<1 | -1>(1);
	const [tick, setTick] = useState(0);
	const [waveUntil, setWaveUntil] = useState(0);
	const [chestOpen, setChestOpen] = useState(false);
	const [ctaVisible, setCtaVisible] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [announcement, setAnnouncement] = useState("");

	const lastScrollXRef = useRef(0);
	const stepAccRef = useRef(0);
	const walkTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const { play: playSfx, resume: resumeAudio } = useChiptuneSfx(sound && !reducedMotion);

	const world = useMemo(
		() => (viewport.ready ? buildWorld(viewport.vw, PIXEL_SCALE) : null),
		[viewport.ready, viewport.vw],
	);

	const step = useCallback(() => {
		if (reducedMotion || !world) return;

		const scrollX = Math.max(0, Math.min(window.scrollY, world.scrollable));
		if (midRef.current) midRef.current.style.transform = `translate3d(${-scrollX}px,0,0)`;
		if (bgRef.current) bgRef.current.style.transform = `translate3d(${-scrollX * 0.35}px,0,0)`;
		if (fgRef.current) fgRef.current.style.transform = `translate3d(${-scrollX * 1.22}px,0,0)`;

		const delta = scrollX - lastScrollXRef.current;
		if (Math.abs(delta) > 0.6) {
			const dir: 1 | -1 = delta < 0 ? -1 : 1;
			if (!walking || dir !== direction) {
				setWalking(true);
				setDirection(dir);
			}
			clearTimeout(walkTimeoutRef.current);
			walkTimeoutRef.current = setTimeout(() => setWalking(false), 160);
			stepAccRef.current += Math.abs(delta);
			if (stepAccRef.current > 150) {
				stepAccRef.current = 0;
				playSfx("step");
			}
		}
		lastScrollXRef.current = scrollX;
		setScrolled(scrollX > 36);

		const playerX = scrollX + viewport.vw * 0.42;
		let nearestIndex = 0;
		let nearestDistance = Number.POSITIVE_INFINITY;
		world.xs.forEach((x, i) => {
			const distance = Math.abs(x - playerX);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestIndex = i;
			}
		});

		if (nearestIndex !== activeIndex) {
			const station = stations[nearestIndex];
			setActiveIndex(nearestIndex);
			setWaveUntil(performance.now() + 1200);
			setAnnouncement(`Estação ${station.num} — ${station.label}. ${station.quote} ${station.subtitle}`);
			if (nearestIndex === world.lastIndex) {
				if (!chestOpen) playSfx("fanfare");
				setChestOpen(true);
				setCtaVisible(true);
			} else {
				playSfx("blip");
			}
		}

		if (!ctaVisible) {
			const lastX = world.xs[world.lastIndex];
			const prevX = world.xs[world.lastIndex - 1];
			if (playerX > prevX + (lastX - prevX) * 0.55) setCtaVisible(true);
		}
	}, [
		reducedMotion,
		world,
		viewport.vw,
		ctaVisible,
		playSfx,
		walking,
		direction,
		activeIndex,
		chestOpen,
		midRef,
		bgRef,
		fgRef,
	]);

	useEffect(() => {
		const measure = () => setViewport({ vw: window.innerWidth, vh: window.innerHeight, ready: true });
		measure();

		let resizeTimer: ReturnType<typeof setTimeout>;
		const onResize = () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(measure, 120);
		};
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			clearTimeout(resizeTimer);
		};
	}, []);

	useEffect(() => {
		if (!viewport.ready) return;
		step();
		window.addEventListener("scroll", step, { passive: true });
		return () => window.removeEventListener("scroll", step);
	}, [viewport.ready, step]);

	useEffect(() => {
		if (reducedMotion) return;
		const interval = setInterval(() => setTick((t) => t + 1), 210);
		return () => clearInterval(interval);
	}, [reducedMotion]);

	useEffect(() => () => clearTimeout(walkTimeoutRef.current), []);

	const goTo = useCallback(
		(index: number) => {
			if (!world) return;
			const clamped = Math.max(0, Math.min(world.xs.length - 1, index));
			window.scrollTo({ top: Math.max(0, world.xs[clamped] - viewport.vw * 0.42), behavior: reducedMotion ? "auto" : "smooth" });
		},
		[world, viewport.vw, reducedMotion],
	);

	useEffect(() => {
		if (reducedMotion) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowRight") {
				event.preventDefault();
				goTo(activeIndex + 1);
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				goTo(activeIndex - 1);
			} else if (event.key === "End") {
				event.preventDefault();
				goTo(stations.length - 1);
			} else if (event.key === "Home") {
				event.preventDefault();
				goTo(0);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [reducedMotion, goTo, activeIndex]);

	const skipToEnd = useCallback(
		(focusTargetId: string) => {
			goTo(stations.length - 1);
			setCtaVisible(true);
			setTimeout(() => document.getElementById(focusTargetId)?.focus(), reducedMotion ? 0 : 900);
		},
		[goTo, reducedMotion],
	);

	const toggleSound = useCallback(() => {
		setSound((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(SOUND_STORAGE_KEY, next ? "1" : "0");
			} catch {
				// idem — sem persistência se localStorage estiver bloqueado.
			}
			if (next) resumeAudio();
			return next;
		});
	}, [resumeAudio]);

	const poseFor = useCallback(
		(stationIndex: number): AvatarPose => {
			if (reducedMotion) return "talk";
			const isActive = activeIndex === stationIndex && (stationIndex > 0 || scrolled);
			if (isActive) return performance.now() < waveUntil ? "wave" : tick % 3 === 0 ? "blink" : "talk";
			return (tick + stationIndex * 5) % 19 === 0 ? "blink" : "talk";
		},
		[reducedMotion, activeIndex, scrolled, waveUntil, tick],
	);

	const playerPose = useCallback((): AvatarPose => {
		if (walking) return tick % 2 ? "blink" : "talk";
		if (activeIndex === 0 && performance.now() < waveUntil + 2500) return tick % 3 === 0 ? "blink" : "talk";
		return tick % 14 === 0 ? "blink" : "talk";
	}, [walking, activeIndex, waveUntil, tick]);

	return {
		reducedMotion,
		world,
		viewport,
		activeIndex,
		walking,
		direction,
		tick,
		chestOpen,
		ctaVisible,
		announcement,
		sound,
		goTo,
		skipToEnd,
		toggleSound,
		poseFor,
		playerPose,
		avatarSrc,
	};
};
