import type { OfficeLayout } from "./office-layout";
import generated from "./office.generated.json";

/**
 * Layout do escritório. ESTE ARQUIVO NÃO É EDITADO À MÃO — e o office.generated.json ao lado também
 * não: os dois saem de `apps/web/authoring/office.ldtk` (editor LDtk) via import-ldtk-office.ts.
 *
 * Para mudar o escritório: abra o .ldtk no LDtk, arraste, salve, rode o importador. Ver ./README.md.
 *
 * O cast existe porque o TS alarga os tipos do JSON (`facing: string`, `version: number`); a forma é
 * garantida pelo importador, e preset-classic-office.test.ts valida o conteúdo a cada build.
 */
export const PRESET_CLASSIC_OFFICE = generated as OfficeLayout;
