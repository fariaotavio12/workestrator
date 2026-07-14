import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { Loader2Icon } from "lucide-react";
import { Navigate } from "react-router-dom";

/** "/" não tem landing pública — manda pro dashboard se logado, ou pro login se não. */
export const RootRedirect = () => {
	const { user, isInitializing } = useAuth();

	if (isInitializing) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2Icon className="animate-spin" />
			</div>
		);
	}

	return <Navigate to={user ? Rotas.protegidas.dashboards.home : Rotas.desprotegidas.auth.login} replace />;
};
