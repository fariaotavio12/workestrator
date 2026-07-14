import { tanStackQueryClient } from "@/app/api/clients";
import { useEffect } from "react";

const THRESHOLD = 80;
const MIN_REFRESH_MS = 800;

/** Ícone do lucide-react "loader-circle", copiado como markup estático — ver nota abaixo sobre o porquê. */
const LOADER_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
	'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
	'class="text-primary animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

export const usePullToRefresh = () => {
	useEffect(() => {
		let startY = 0;
		let pulling = false;
		let visible = false;

		// DOM puro em vez de montar um segundo root do React (`createRoot`) aqui: desmontar esse root
		// sincronamente no cleanup do efeito colidia com o ciclo de render do React (mais visível sob
		// HMR), disparando "Attempted to synchronously unmount a root while React was already rendering".
		const container = document.createElement("div");
		container.className = "pointer-events-none fixed top-0 right-0 left-0 z-9999 flex items-center justify-center p-3";
		container.style.opacity = "0";
		container.style.transition = "opacity 0.2s ease";
		container.innerHTML = `<div class="bg-background flex h-9 w-9 items-center justify-center rounded-full shadow-md">${LOADER_SVG}</div>`;
		document.body.appendChild(container);

		const show = () => {
			if (visible) return;
			visible = true;
			container.style.opacity = "1";
		};

		const hide = () => {
			visible = false;
			container.style.opacity = "0";
		};

		const onTouchStart = (e: TouchEvent) => {
			if (window.scrollY === 0) {
				startY = e.touches[0].clientY;
				pulling = true;
			}
		};

		const onTouchMove = (e: TouchEvent) => {
			if (!pulling) return;
			const delta = e.touches[0].clientY - startY;
			if (delta >= THRESHOLD / 2) show();
		};

		const onTouchEnd = async (e: TouchEvent) => {
			if (!pulling) return;
			pulling = false;
			const delta = e.changedTouches[0].clientY - startY;
			if (delta >= THRESHOLD) {
				show();
				await Promise.allSettled([
					tanStackQueryClient.invalidateQueries(),
					new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_MS)),
				]);
			}
			hide();
		};

		document.addEventListener("touchstart", onTouchStart, { passive: true });
		document.addEventListener("touchmove", onTouchMove, { passive: true });
		document.addEventListener("touchend", onTouchEnd, { passive: true });

		return () => {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
			container.remove();
		};
	}, []);
};
