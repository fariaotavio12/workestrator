import * as React from "react";

export type HotkeySpec = {
	key?: string | readonly string[];
	/** Compara por e.code (físico, independente de layout). Use quando Ctrl+Alt conflita com AltGr. */
	code?: string | readonly string[];
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	meta?: boolean;
	allowRepeat?: boolean; // default: true
};

export type KeyCombo = string | HotkeySpec;

export type UseHotkeyOptions = {
	enabled?: boolean;
	event?: "keydown" | "keyup";
	target?: Document | Window | HTMLElement | null;
	preventDefault?: boolean;
	stopPropagation?: boolean;
	ignoreWhenTyping?: boolean;
};

const isTypingTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;

	const tag = target.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const normalizeKeys = (key: string | readonly string[]): readonly string[] =>
	Array.isArray(key) ? key : [key as string];

const normalizeCombo = (combo: KeyCombo): HotkeySpec =>
	typeof combo === "string" ? { key: combo } : combo;

export const useHotkey = (
	combo: KeyCombo,
	handler: (e: KeyboardEvent) => void,
	options: UseHotkeyOptions = {},
): void => {
	const {
		enabled = true,
		event = "keydown",
		target = document,
		preventDefault = true,
		stopPropagation = false,
		ignoreWhenTyping = true,
	} = options;

	const handlerRef = React.useRef(handler);
	const comboRef = React.useRef(combo);

	React.useEffect(() => {
		handlerRef.current = handler;
	}, [handler]);

	React.useEffect(() => {
		comboRef.current = combo;
	}, [combo]);

	React.useEffect(() => {
		if (!enabled || !target) return;

		const listener: EventListener = (evt) => {
			const e = evt as KeyboardEvent;
			const spec = normalizeCombo(comboRef.current);

			if (spec.code !== undefined) {
				const codes = normalizeKeys(spec.code);
				if (!codes.includes(e.code)) return;
			} else if (spec.key !== undefined) {
				const keys = normalizeKeys(spec.key);
				if (!keys.includes(e.key)) return;
			} else {
				return;
			}

			if (spec.ctrl !== undefined && spec.ctrl !== e.ctrlKey) return;
			if (spec.alt !== undefined && spec.alt !== e.altKey) return;
			if (spec.shift !== undefined && spec.shift !== e.shiftKey) return;
			if (spec.meta !== undefined && spec.meta !== e.metaKey) return;

			if (spec.allowRepeat === false && e.repeat) return;

			if (ignoreWhenTyping && isTypingTarget(e.target)) return;

			if (preventDefault) e.preventDefault();
			if (stopPropagation) e.stopPropagation();

			handlerRef.current(e);
		};

		target.addEventListener(event, listener);
		return () => target.removeEventListener(event, listener);
	}, [enabled, target, event, preventDefault, stopPropagation, ignoreWhenTyping]);
}
