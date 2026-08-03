import { useCallback, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

const STORAGE_PREFIX = "workestrator:sheet-width:";
const VIEWPORT_GUTTER = 32;
const KEYBOARD_STEP = 32;
const MAXIMIZED_WIDTH = "calc(100vw - 1rem)";

type StoredWidth = { width: number | null; maximized: boolean };

type UseSheetWidthOptions = {
	storageKey?: string;
	minWidth?: number;
	enabled?: boolean;
};

const EMPTY: StoredWidth = { width: null, maximized: false };

const maxWidthFor = (minWidth: number): number =>
	typeof window === "undefined" ? minWidth : Math.max(minWidth, window.innerWidth - VIEWPORT_GUTTER);

const readStored = (storageKey?: string): StoredWidth => {
	if (!storageKey || typeof window === "undefined") return EMPTY;
	try {
		const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
		if (!raw) return EMPTY;
		const parsed = JSON.parse(raw) as Partial<StoredWidth>;
		return {
			width: typeof parsed.width === "number" && Number.isFinite(parsed.width) ? parsed.width : null,
			maximized: parsed.maximized === true,
		};
	} catch {
		return EMPTY;
	}
};

const writeStored = (storageKey: string | undefined, state: StoredWidth) => {
	if (!storageKey || typeof window === "undefined") return;
	const key = `${STORAGE_PREFIX}${storageKey}`;
	try {
		if (state.width === null && !state.maximized) window.localStorage.removeItem(key);
		else window.localStorage.setItem(key, JSON.stringify(state));
	} catch {
		return;
	}
};

/**
 * Largura ajustável de um painel ancorado à direita, lembrada por `storageKey`.
 * `width === null` mantém a largura padrão do componente, então quem nunca arrastou não vê diferença.
 */
export const useSheetWidth = ({ storageKey, minWidth = 380, enabled = true }: UseSheetWidthOptions) => {
	const [state, setState] = useState<StoredWidth>(() => (enabled ? readStored(storageKey) : EMPTY));
	const dragging = useRef(false);

	const commit = useCallback(
		(next: StoredWidth) => {
			setState(next);
			writeStored(storageKey, next);
		},
		[storageKey],
	);

	const setWidth = useCallback(
		(value: number) => {
			const clamped = Math.min(Math.max(value, minWidth), maxWidthFor(minWidth));
			commit({ width: Math.round(clamped), maximized: false });
		},
		[commit, minWidth],
	);

	const resetWidth = useCallback(() => commit(EMPTY), [commit]);

	const toggleMaximized = useCallback(() => {
		setState((current) => {
			const next: StoredWidth = { width: current.width, maximized: !current.maximized };
			writeStored(storageKey, next);
			return next;
		});
	}, [storageKey]);

	const startDrag = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			if (!enabled || event.button !== 0) return;
			event.preventDefault();
			const handle = event.currentTarget;
			handle.setPointerCapture(event.pointerId);
			dragging.current = true;
			document.body.style.userSelect = "none";
			document.body.style.cursor = "col-resize";

			const move = (moveEvent: PointerEvent) => {
				if (dragging.current) setWidth(window.innerWidth - moveEvent.clientX);
			};
			const stop = () => {
				dragging.current = false;
				document.body.style.userSelect = "";
				document.body.style.cursor = "";
				handle.removeEventListener("pointermove", move);
				handle.removeEventListener("pointerup", stop);
				handle.removeEventListener("pointercancel", stop);
			};

			handle.addEventListener("pointermove", move);
			handle.addEventListener("pointerup", stop);
			handle.addEventListener("pointercancel", stop);
		},
		[enabled, setWidth],
	);

	const onHandleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLElement>) => {
			const current = state.maximized ? maxWidthFor(minWidth) : (state.width ?? minWidth);
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				setWidth(current + KEYBOARD_STEP);
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				setWidth(current - KEYBOARD_STEP);
			} else if (event.key === "Home") {
				event.preventDefault();
				resetWidth();
			} else if (event.key === "End") {
				event.preventDefault();
				setWidth(maxWidthFor(minWidth));
			}
		},
		[minWidth, resetWidth, setWidth, state.maximized, state.width],
	);

	const style: CSSProperties | undefined = !enabled
		? undefined
		: state.maximized
			? { width: MAXIMIZED_WIDTH, maxWidth: MAXIMIZED_WIDTH }
			: state.width !== null
				? { width: state.width, maxWidth: MAXIMIZED_WIDTH }
				: undefined;

	return {
		width: state.width,
		maximized: state.maximized,
		style,
		startDrag,
		onHandleKeyDown,
		toggleMaximized,
		resetWidth,
	};
};
