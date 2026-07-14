import { applyMetadataByPath } from "@/app/lib/seo";
import { Middleware } from "@/app/routing/middleware";
import { MiddlewareAuth } from "@/app/routing/middlewareAuth";
import { RootRedirect } from "@/app/routing/rootRedirect";
import { Rotas } from "@/app/routing/variables";
import { LayoutAuth } from "@/features/public/auth/layout";
import { PageLogin } from "@/features/public/auth/login";
import { PagePasswordRecovery } from "@/features/public/auth/password-recovery";
import { PageRegister } from "@/features/public/auth/register";
import { PageDesignSystem } from "@/features/public/design-system/page-design-system";
import { PageDevelopmentInterest } from "@/features/public/development-interest";
import { PageDownload } from "@/features/public/download";
import { PageExplore } from "@/features/public/explore";
import { HomePage } from "@/features/public/landing-pages/home";
import { LayoutLandingPages } from "@/features/public/landing-pages/layout";
import { PageCommands } from "@/features/security/commands";
import { PageCommunityAssets } from "@/features/security/community-assets";
import { PageConfigAssistant } from "@/features/security/config-assistant";
import { PageExecutions } from "@/features/security/executions";
import { PageKnowledge, PageKnowledgeDetail } from "@/features/security/knowledge";
import { PageModels } from "@/features/security/models";
import { PageScripts } from "@/features/security/scripts";
import { PageSecrets } from "@/features/security/secrets";
import { PageSkills } from "@/features/security/skills";
import { PageSquadDetail } from "@/features/security/squad-detail";
import { PageSquadShareAccept } from "@/features/security/squad-share";
import { PageSquads } from "@/features/security/squads";
import { PageNotFound } from "@/features/public/notfound";
import { LayoutDashboard } from "@/features/security/layout";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";

const RouteMetadataSync = () => {
	const { pathname } = useLocation();

	useEffect(() => {
		applyMetadataByPath(pathname);
	}, [pathname]);

	return null;
};

const LegacyParamRedirect = ({ to }: { to: (params: Record<string, string | undefined>) => string }) => {
	const params = useParams();

	return <Navigate to={to(params)} replace />;
};

export const AppRouter = () => (
	<>
		<RouteMetadataSync />
		<Routes>
			<Route element={<MiddlewareAuth />}>
				<Route element={<LayoutAuth />}>
					<Route path={Rotas.desprotegidas.auth.login} element={<PageLogin />} />
					<Route path={Rotas.desprotegidas.auth.register} element={<PageRegister />} />
					<Route path={Rotas.desprotegidas.auth.passwordRecovery} element={<PagePasswordRecovery />} />
				</Route>
			</Route>

			<Route
				path={Rotas.desprotegidas.landingPages.home}
				element={window.__ORCH_API__ ? <RootRedirect /> : <LayoutLandingPages />}
			>
				<Route index element={<HomePage />} />
			</Route>
			<Route element={<LayoutLandingPages />}>
				<Route path={Rotas.desprotegidas.landingPages.download} element={<PageDownload />} />
				<Route path={Rotas.desprotegidas.landingPages.participate} element={<PageDevelopmentInterest />} />
				<Route path={Rotas.desprotegidas.landingPages.explore} element={<PageExplore />} />
			</Route>
			<Route element={<Middleware />}>
				<Route element={<LayoutDashboard />}>
					<Route path={Rotas.protegidas.orchestrator.squads} element={<PageSquads />} />
					<Route path={Rotas.protegidas.orchestrator.squadDetail} element={<PageSquadDetail />} />
					<Route path={Rotas.protegidas.orchestrator.tools} element={<PageScripts />} />
					<Route
						path={Rotas.protegidas.orchestrator.scripts}
						element={<Navigate to={Rotas.protegidas.orchestrator.tools} replace />}
					/>
					<Route path={Rotas.protegidas.orchestrator.models} element={<PageModels />} />
					<Route path={Rotas.protegidas.orchestrator.executions} element={<PageExecutions />} />
					<Route path={Rotas.protegidas.orchestrator.secrets} element={<PageSecrets />} />
					<Route path={Rotas.protegidas.orchestrator.knowledge} element={<PageKnowledge />} />
					<Route path={Rotas.protegidas.orchestrator.knowledgeDetail} element={<PageKnowledgeDetail />} />
					<Route path={Rotas.protegidas.orchestrator.assistant} element={<PageConfigAssistant />} />
					<Route path={Rotas.protegidas.orchestrator.assistantSession} element={<PageConfigAssistant />} />
					<Route path={Rotas.protegidas.orchestrator.commands} element={<PageCommands />} />
					<Route path={Rotas.protegidas.orchestrator.skills} element={<PageSkills />} />
					<Route path={Rotas.protegidas.orchestrator.communityAssets} element={<PageCommunityAssets />} />
					<Route
						path={Rotas.protegidas.orchestrator.mcp}
						element={<Navigate to={Rotas.protegidas.orchestrator.tools} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.squads}
						element={<Navigate to={Rotas.protegidas.orchestrator.squads} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.squadDetail}
						element={<LegacyParamRedirect to={({ id }) => `/dashboard/squads/${id ?? ""}`} />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.scripts}
						element={<Navigate to={Rotas.protegidas.orchestrator.tools} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.tools}
						element={<Navigate to={Rotas.protegidas.orchestrator.tools} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.models}
						element={<Navigate to={Rotas.protegidas.orchestrator.models} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.executions}
						element={<Navigate to={Rotas.protegidas.orchestrator.executions} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.secrets}
						element={<Navigate to={Rotas.protegidas.orchestrator.secrets} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.knowledge}
						element={<Navigate to={Rotas.protegidas.orchestrator.knowledge} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.knowledgeDetail}
						element={<LegacyParamRedirect to={({ id }) => `/dashboard/conhecimento/${id ?? ""}`} />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.assistant}
						element={<Navigate to={Rotas.protegidas.orchestrator.assistant} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.assistantSession}
						element={<LegacyParamRedirect to={({ sessionId }) => `/dashboard/assistente/${sessionId ?? ""}`} />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.commands}
						element={<Navigate to={Rotas.protegidas.orchestrator.commands} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.skills}
						element={<Navigate to={Rotas.protegidas.orchestrator.skills} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.communityAssets}
						element={<Navigate to={Rotas.protegidas.orchestrator.communityAssets} replace />}
					/>
					<Route
						path={Rotas.protegidas.legacyOrchestrator.mcp}
						element={<Navigate to={Rotas.protegidas.orchestrator.tools} replace />}
					/>
				</Route>
			</Route>
			<Route path={Rotas.desprotegidas.designSystem} element={<PageDesignSystem />} />
			<Route path={Rotas.desprotegidas.share} element={<PageSquadShareAccept />} />
			<Route path={Rotas.desprotegidas.NOT_FOUND} element={<PageNotFound />} />
		</Routes>
	</>
);
