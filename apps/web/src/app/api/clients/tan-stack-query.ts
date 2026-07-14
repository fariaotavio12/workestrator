import { QueryClient } from "@tanstack/react-query";

export const tanStackQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: false,
			// `networkMode: "online"` (padrão) pausa retries indefinidamente se o `onlineManager`
			// interno achar que o navegador está offline — e esse estado cacheado pode dessincronizar
			// de `navigator.onLine` (visto em ambientes de automação, e é um problema conhecido do
			// Chromium embarcado no Electron). "always" ignora esse status e sempre tenta de verdade.
			networkMode: "always",
		},
	},
});
