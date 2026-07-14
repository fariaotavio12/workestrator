import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { Loader2Icon } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

/** Guarda as paginas publicas de auth (login/registrar/recuperar-senha) — afasta quem ja esta logado. */
export const MiddlewareAuth = () => {
	const { isInitializing, user } = useAuth();

	if (isInitializing) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2Icon className="animate-spin" />
			</div>
		);
	}

	if (user) {
		return <Navigate to={Rotas.protegidas.dashboards.home} replace />;
	}

	return <Outlet />;
};
