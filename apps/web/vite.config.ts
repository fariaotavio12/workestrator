import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";

import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import {
	handleListFiles,
	handleListModels,
	handlePreviewFile,
	handleRegisterPreview,
	handleResetWorkspace,
	handleRunStep,
	handleSnapshotRun,
	handleTestSecret,
	handleTestTool,
} from "./electron/runner/runner";

/**
 * Dev-only: expõe /api/run-step, /api/list-models, /api/test-secret e /api/test-tool delegando pros
 * handlers compartilhados em `electron/runner/runner.ts` (os mesmos usados pelo servidor local do
 * processo main do Electron em produção). Só existe com `vite dev` — não roda no build/preview de
 * produção; lá quem atende essas rotas é o Electron.
 */
const orchestratorRunnerPlugin = (): Plugin => ({
	name: "orchestrator-claude-cli-runner",
	configureServer(server) {
		server.middlewares.use("/api/run-step", (req, res) => {
			void handleRunStep(req, res);
		});
		server.middlewares.use("/api/list-models", (req, res) => {
			void handleListModels(req, res);
		});
		server.middlewares.use("/api/test-secret", (req, res) => {
			void handleTestSecret(req, res);
		});
		server.middlewares.use("/api/test-tool", (req, res) => {
			void handleTestTool(req, res);
		});
		server.middlewares.use("/api/register-preview", (req, res) => {
			void handleRegisterPreview(req, res);
		});
		server.middlewares.use("/api/list-files", (req, res) => {
			void handleListFiles(req, res);
		});
		server.middlewares.use("/api/snapshot-run", (req, res) => {
			void handleSnapshotRun(req, res);
		});
		server.middlewares.use("/api/reset-workspace", (req, res) => {
			void handleResetWorkspace(req, res);
		});
		// Dev não tem token — serve sem validação (só existe localmente no `vite dev`).
		server.middlewares.use("/preview", (req, res) => {
			handlePreviewFile(req, res);
		});
	},
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
	// Electron serve o build via `file://` — caminhos absolutos (`/assets/...`) não resolvem nesse
	// protocolo, só relativos. Demais modos (localhost/dev/main) continuam servidos por HTTP normal.
	base: mode === "electron" ? "./" : "/",
	plugins: [
		{
			...mdx({
				remarkPlugins: [remarkGfm],
				rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]],
			}),
			enforce: "pre",
		},
		react({
			include: ["**/*.tsx", "**/*.ts", "**/*.mdx"],
		}),
		tailwindcss(),
		orchestratorRunnerPlugin(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
		dedupe: ["react", "react-dom"],
	},
	optimizeDeps: {
		exclude: ["@mantine/hooks", "@mantine/core", "@mantine/utils"],
	},
	build: {
		cssMinify: "esbuild" as const,
	},
}));
