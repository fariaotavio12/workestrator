/**
 * Traz o escritório desenhado no LDtk pro app: authoring/office.ldtk → layout/office.generated.json.
 *
 * Este é o ÚNICO caminho entre o editor e o código, e ele anda numa direção só: o .ldtk é a fonte de
 * autoria, o .json é a saída que a cena consome. Depois de editar e salvar no LDtk, rode isto.
 *
 * Rodar: npx tsx scripts/import-ldtk-office.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LdtkProject } from "../src/features/security/squad-detail/office-scene/authoring/ldtk-schema";
import { ldtkToLayout } from "../src/features/security/squad-detail/office-scene/authoring/ldtk-to-layout";
import type { OfficeLayout } from "../src/features/security/squad-detail/office-scene/layout/office-layout";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../authoring/office.ldtk");
const target = resolve(here, "../src/features/security/squad-detail/office-scene/layout/office.generated.json");

if (!existsSync(source)) {
	console.error(`não achei ${relative(process.cwd(), source)} — o projeto do LDtk sumiu?`);
	process.exit(1);
}

// Lê a versão anterior ANTES de sobrescrever, só p/ relatar o que o editor mudou.
const previous: OfficeLayout | null = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : null;
const layout = ldtkToLayout(JSON.parse(readFileSync(source, "utf8")) as LdtkProject);

writeFileSync(target, `${JSON.stringify(layout, null, "\t")}\n`);
console.log(`${relative(process.cwd(), target)} atualizado`);

const counts = (l: OfficeLayout) => ({
	peças: l.furniture.length,
	paredes: l.walls.length,
	vidros: l.glass.length,
	portas: l.doors.length,
	baias: l.deskAnchors.length,
	pisos: l.floors.length,
});

const after = counts(layout);
for (const key of Object.keys(after) as (keyof typeof after)[]) {
	const delta = previous ? after[key] - counts(previous)[key] : 0;
	console.log(`  ${key}: ${after[key]}${delta === 0 ? "" : ` (${delta > 0 ? "+" : ""}${delta})`}`);
}

if (previous && JSON.stringify(previous) === JSON.stringify(layout)) {
	console.log("\nNada mudou desde a última importação.");
} else if (previous) {
	console.log("\nLayout atualizado — rode os testes e confira a cena.");
}
