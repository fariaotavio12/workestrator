// Alvo do React.lazy — importar este módulo puxa o Phaser (~1.2MB) para um chunk async.
// NÃO importar estaticamente fora de um lazy/Suspense (senão o phaser entra no bundle principal).
export { OfficeStage, type OfficeStageProps } from "./office-stage";
