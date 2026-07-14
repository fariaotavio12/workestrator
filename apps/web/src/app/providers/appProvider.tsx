import { tanStackQueryClient } from "@/app/api/clients";
import { useElectronUpdates } from "@/app/hooks/useElectronUpdates";
import { usePullToRefresh } from "@/app/hooks/usePullToRefresh";
import { AuthProvider } from "@/app/providers/authProvider";
import { OverlayPreferenceProvider } from "@/app/providers/ui-overlay-preference";
import { ThemeProvider } from "@/app/providers/useThemeContext";

import { SidebarProvider } from "@/components/sidebar";
import { Toaster } from "@/components/sonner/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";

type AppProviderProps = {
	children: ReactNode;
};

const AppInner = ({ children }: AppProviderProps) => {
	usePullToRefresh();
	useElectronUpdates();
	return <>{children}</>;
};

// No Electron o app é servido via `file://` — BrowserRouter (history API) não sobrevive a reload/deep
// link nesse protocolo. `window.__ORCH_API__` só existe quando o preload do Electron injeta a ponte.
const Router = window.__ORCH_API__ ? HashRouter : BrowserRouter;

export const AppProvider = ({ children }: AppProviderProps): ReactNode => {
	return (
		<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
			<QueryClientProvider client={tanStackQueryClient}>
				<Router>
					<AuthProvider>
						<SidebarProvider>
							<OverlayPreferenceProvider>
								<AppInner>{children}</AppInner>
							</OverlayPreferenceProvider>
						</SidebarProvider>
					</AuthProvider>
					<Toaster />
				</Router>
			</QueryClientProvider>
		</ThemeProvider>
	);
};
