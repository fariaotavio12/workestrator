import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { Loader2Icon } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/** Guarda as paginas protegidas do app (orquestrador) — exige login. */
export const Middleware = () => {
	const { user, isInitializing } = useAuth();
	const location = useLocation();

	if (isInitializing) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2Icon className="animate-spin" />
			</div>
		);
	}

	if (!user) {
		return (
			<Navigate
				to={Rotas.desprotegidas.landingPages.home}
				replace
				state={{ from: `${location.pathname}${location.search}${location.hash}` }}
			/>
		);
	}

	return <Outlet />;
};
