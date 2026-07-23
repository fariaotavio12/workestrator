import { cpSync } from "node:fs";
import { build } from "esbuild";

// Compila electron/main.ts e electron/preload.ts (Node puro, sem passar pelo Vite/rolldown) pra
// dist-electron/. Mantido como script isolado pra não brigar com o override `vite: npm:rolldown-vite`.
await build({
	entryPoints: ["electron/main.ts", "electron/preload.ts"],
	outdir: "dist-electron",
	outExtension: { ".js": ".cjs" },
	platform: "node",
	target: "node20",
	format: "cjs",
	bundle: true,
	external: ["electron", "electron-updater", "playwright"],
	sourcemap: true,
	// runner.ts usa `import.meta.url` só como fallback dentro de um `typeof __dirname !== "undefined"`
	// — nesse bundle CJS, __dirname sempre existe, então esse branch nunca roda; o aviso do esbuild é
	// sobre sintaxe estática, não sobre um bug real (ver electron/runner/runner.ts:CURRENT_DIR).
	logOverride: { "empty-import-meta": "silent" },
});

// electron/mcp-servers/*.mjs rodam como processos filhos plain-Node (nunca passam pelo esbuild acima)
// — copiados as-is pra dist-electron/mcp-servers/ pra `runner.ts` (bundlado, CURRENT_DIR = dist-electron/)
// achar `../mcp-servers` tanto no app empacotado (electron-builder) quanto no `electron:dev` local.
// Sem este passo esses servers (http-tool.mjs, youtube.mjs, workspace-fs.mjs, ...) nunca existiam de
// verdade em nenhum dos dois — só funcionavam no `vite dev` puro (sem Electron).
cpSync("electron/mcp-servers", "dist-electron/mcp-servers", { recursive: true });
