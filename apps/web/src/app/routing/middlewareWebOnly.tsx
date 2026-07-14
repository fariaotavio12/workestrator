import { Outlet } from "react-router-dom";

/**
 * Mantido para preservar a estrutura das rotas apos a remocao do build nativo.
 */
export const MiddlewareWebOnly = () => {
	return <Outlet />;
};
