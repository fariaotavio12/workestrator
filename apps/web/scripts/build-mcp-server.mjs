import { build } from "esbuild";

// Compila electron/mcp-server/index.ts (Node puro, mesma convenção de build-electron.mjs) num único
// arquivo CJS bundled — inclui `operations/catalog.ts` + `operations/schemas.ts` (puros, sem Vite),
// sem precisar resolver `@/` nem rodar Vite. Publicado como bin `workestrator-mcp` (Etapa 5a do plano).
await build({
	entryPoints: ["electron/mcp-server/index.ts"],
	outfile: "dist-electron/mcp-server.mjs",
	platform: "node",
	target: "node20",
	format: "esm",
	bundle: true,
	sourcemap: true,
	// `form-data`/`combined-stream` (dependências do axios) fazem `require()` dinâmico incompatível
	// com bundle ESM do esbuild — deixa o axios de fora do bundle, resolvido via node_modules em runtime.
	external: ["axios"],
});
