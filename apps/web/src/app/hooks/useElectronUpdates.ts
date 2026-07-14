import { notify } from "@/components";
import { useEffect, useRef } from "react";

export const useElectronUpdates = (): void => {
	const notifiedAvailableVersion = useRef<string | null>(null);
	const notifiedDownloadedVersion = useRef<string | null>(null);

	useEffect(() => {
		const updates = window.__ORCH_API__?.updates;
		if (!updates) return;

		const unsubscribe = updates.onStatus((payload) => {
			if (payload.status === "available") {
				const version = payload.version ?? "mais recente";
				if (notifiedAvailableVersion.current === version) return;
				notifiedAvailableVersion.current = version;
				notify.info("Atualização encontrada", `Baixando a versão ${version} em segundo plano.`);
			}

			if (payload.status === "downloaded") {
				const version = payload.version ?? "mais recente";
				if (notifiedDownloadedVersion.current === version) return;
				notifiedDownloadedVersion.current = version;
				notify.success("Atualização pronta", `A versão ${version} já pode ser instalada.`, {
					label: "Reiniciar e instalar",
					onClick: () => void updates.install(),
				});
			}

			if (payload.status === "error") {
				notify.error("Falha ao procurar atualização", payload.message ?? "Tente novamente mais tarde.");
			}
		});

		void updates.check();

		return unsubscribe;
	}, []);
};
