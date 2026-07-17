/**
 * Ordem de desenho (painter's algorithm). Pisos/tapetes têm depth fixo negativo; todo o resto —
 * móveis, paredes, personagens — ordena pela baseline Y no mundo (quem está mais abaixo desenha por
 * cima). Peças de um mesmo módulo (baia) usam frações de z para manter a ordem interna provada.
 */

export const DEPTH = {
	floorBase: -10000,
	floorZone: -9900,
	rug: -9000,
	wallSide: -8800,
} as const;

/** Depth por baseline Y — usado por móveis soltos, paredes e personagens. */
export const yDepth = (worldY: number): number => worldY;
