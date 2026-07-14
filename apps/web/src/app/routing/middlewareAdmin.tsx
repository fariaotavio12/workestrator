import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { Loader2Icon } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

export const MiddlewareAdmin = () => {
	const { user, isAdmin, isInitializing } = useAuth();

	if (isInitializing) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2Icon className="animate-spin" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to={Rotas.desprotegidas.auth.login} replace />;
	}

	if (!isAdmin) {
		return <Navigate to={Rotas.protegidas.dashboards.home} replace />;
	}

	return <Outlet />;
};
