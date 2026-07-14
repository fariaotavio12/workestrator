import * as React from "react";

export type OverlayMode = "center" | "sidebar";
export type SidebarSide = "right" | "left";

type Ctx = {
	mode: OverlayMode;
	setMode: (m: OverlayMode) => void;
};

const Ctx = React.createContext<Ctx | null>(null);
const STORAGE_KEY = "overlayMode";

const readMode = (): OverlayMode => {
	if (typeof window === "undefined") return "center";
	const v = window.localStorage.getItem(STORAGE_KEY);
	return v === "sidebar" ? "sidebar" : "center";
}

export const OverlayPreferenceProvider = ({ children }: { children: React.ReactNode }) => {
	const [mode, setModeState] = React.useState<OverlayMode>("center");

	React.useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setModeState(readMode());
	}, []);

	const setMode = React.useCallback((m: OverlayMode) => {
		setModeState(m);
		if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, m);
	}, []);

	return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export const useOverlayPreference = () => {
	const ctx = React.useContext(Ctx);
	if (!ctx) throw new Error("useOverlayPreference must be used inside OverlayPreferenceProvider");
	return ctx;
}
