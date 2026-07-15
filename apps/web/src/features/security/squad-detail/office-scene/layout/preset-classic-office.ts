import type { FurnitureInstance, OfficeLayout } from "./office-layout";

/**
 * Escritório padrão — recria a imagem de referência: sala do gerente (topo-esq.), sala de reunião com
 * vidro (topo-dir.), workspace de baias (centro-esq.), lounge (inf.-dir.), entrada de vidro (inf.-centro).
 * Grade 24×15 células (1 célula = 64px → mundo 1536×960). As posições são afinadas visualmente contra
 * o render; este literal é a fonte única do layout até existir o criador de escritório.
 *
 * Coordenadas: x cresce p/ direita (0..23), y p/ baixo (0..14). A célula de uma peça é sua baseline
 * (centro-x / base). Âncoras de baia = onde a pessoa senta; o módulo de baia é montado em volta.
 */

let n = 0;
const f = (propId: string, x: number, y: number, extra: Partial<FurnitureInstance> = {}): FurnitureInstance => ({
	id: `${propId}#${n++}`,
	propId,
	cell: { x, y },
	...extra,
});

export const PRESET_CLASSIC_OFFICE: OfficeLayout = {
	version: 1,
	grid: { cols: 24, rows: 15 },

	floors: [
		// Zona base: piso de madeira cobrindo a sala inteira.
		{ rect: { x: 0, y: 0, w: 24, h: 15 }, texture: "wood" },
		// Carpete da sala de reunião (topo-direito).
		{ rect: { x: 15, y: 0, w: 9, h: 6 }, texture: "meeting-carpet" },
	],

	// Paredes sólidas (cream) — perímetro + divisórias internas. Extremos inclusivos, alinhadas a eixo.
	walls: [
		{ from: { x: 0, y: 0 }, to: { x: 23, y: 0 } }, // topo
		{ from: { x: 0, y: 0 }, to: { x: 0, y: 14 } }, // esquerda
		{ from: { x: 23, y: 0 }, to: { x: 23, y: 14 } }, // direita
		{ from: { x: 0, y: 14 }, to: { x: 8, y: 14 } }, // rodapé esquerdo (até a entrada)
		{ from: { x: 13, y: 14 }, to: { x: 23, y: 14 } }, // rodapé direito (após a entrada)
		{ from: { x: 7, y: 0 }, to: { x: 7, y: 3 } }, // parede direita da sala do gerente (deixa porta em y=4)
		{ from: { x: 0, y: 5 }, to: { x: 4, y: 5 } }, // parede inferior da sala do gerente (porta em x=5..6)
	],

	// Paredes de vidro (repete o painel ao longo do eixo).
	glass: [
		{ from: { x: 15, y: 0 }, to: { x: 15, y: 4 } }, // parede esquerda da sala de reunião (porta em y=5)
		{ from: { x: 15, y: 6 }, to: { x: 23, y: 6 } }, // parede inferior da sala de reunião
	],

	doors: [
		{ cell: { x: 6, y: 5 }, kind: "glass-single" }, // saída da sala do gerente
		{ cell: { x: 15, y: 5 }, kind: "glass-single" }, // porta da sala de reunião
		{ cell: { x: 10, y: 14 }, kind: "glass-double" }, // entrada principal
	],

	// Coordenador mora na sala do gerente (topo-esquerdo), olhando para o salão.
	coordinator: { cell: { x: 3, y: 3 }, facing: "right" },

	// 12 âncoras de baia (MAX_SEATS) no workspace: 3 fileiras × 4, todas olhando p/ a direita.
	// Slots row-major → 1º assento criado cai no canto superior-esquerdo do workspace.
	deskAnchors: [
		{ id: "desk-0", slot: 0, cell: { x: 3, y: 8 }, facing: "right" },
		{ id: "desk-1", slot: 1, cell: { x: 7, y: 8 }, facing: "right" },
		{ id: "desk-2", slot: 2, cell: { x: 11, y: 8 }, facing: "right" },
		{ id: "desk-3", slot: 3, cell: { x: 13, y: 8 }, facing: "right" },
		{ id: "desk-4", slot: 4, cell: { x: 3, y: 11 }, facing: "right" },
		{ id: "desk-5", slot: 5, cell: { x: 7, y: 11 }, facing: "right" },
		{ id: "desk-6", slot: 6, cell: { x: 11, y: 11 }, facing: "right" },
		{ id: "desk-7", slot: 7, cell: { x: 13, y: 11 }, facing: "right" },
		{ id: "desk-8", slot: 8, cell: { x: 3, y: 14 }, facing: "right" },
		{ id: "desk-9", slot: 9, cell: { x: 7, y: 14 }, facing: "right" },
		{ id: "desk-10", slot: 10, cell: { x: 11, y: 14 }, facing: "right" },
		{ id: "desk-11", slot: 11, cell: { x: 13, y: 14 }, facing: "right" },
	],

	furniture: [
		// --- Sala do gerente (topo-esquerdo) ---
		f("49_framed-city-picture", 2, 0, { offset: { x: 0, y: 0.2 } }),
		f("22_wall-analytics-dashboard", 5, 0, { offset: { x: 0, y: 0.2 } }),
		f("19_bookcase-filled-variant", 1, 2),
		f("53_low-side-cabinet", 6, 2),
		f("31_floor-plant-small", 1, 4),

		// --- Sala de reunião (topo-direito) ---
		f("22_wall-analytics-dashboard", 19, 0, { offset: { x: 0, y: 0.2 } }),
		f("02_conference-table-empty", 18, 3),
		f("02_conference-table-empty", 20, 3),
		f("16_conference-centerpiece", 19, 2, { offset: { x: 0, y: 0.3 } }),
		f("15_conference-chair-teal", 17, 1),
		f("15_conference-chair-teal", 19, 1),
		f("15_conference-chair-teal", 21, 1),
		f("15_conference-chair-teal", 17, 4, { flip: true }),
		f("15_conference-chair-teal", 19, 4, { flip: true }),
		f("15_conference-chair-teal", 21, 4, { flip: true }),
		f("15_conference-chair-teal", 16, 2),
		f("15_conference-chair-teal", 22, 2, { flip: true }),

		// --- Parede direita (mural, armário, terminal, lixeira) ---
		f("29_noticeboard-notes", 22, 7, { offset: { x: 0.3, y: 0 } }),
		f("50_access-control-terminal", 23, 9, { offset: { x: -0.2, y: 0 } }),
		f("53_low-side-cabinet", 22, 9),
		f("32_recycling-bin-blue", 23, 11),

		// --- Lounge (inferior-direito) ---
		f("44_lounge-rug-orange", 19, 12),
		f("23_sofa-blue", 20, 10),
		f("37_sofa-cushion-orange", 19, 10, { offset: { x: 0.2, y: 0.1 } }),
		f("38_sofa-cushion-teal", 21, 10, { offset: { x: -0.2, y: 0.1 } }),
		f("24_lounge-armchair-teal", 17, 11, { flip: true }),
		f("24_lounge-armchair-teal", 22, 13),
		f("04_coffee-table-empty", 19, 12),
		f("13_desk-plant-small", 19, 12, { offset: { x: 0, y: -0.3 } }),
		f("25_office-magazine", 18, 12, { offset: { x: 0.3, y: 0 } }),
		f("30_floor-plant-large", 23, 13),

		// --- Inferior-esquerdo (arquivo, impressora, caixas) ---
		f("06_filing-shelf-empty", 1, 12),
		f("39_office-binder-single", 2, 12, { offset: { x: 0, y: -0.4 } }),
		f("27_multifunction-printer", 3, 13),
		f("40_storage-box-small", 1, 13, { offset: { x: -0.3, y: 0.2 } }),

		// --- Entrada (inferior-centro) ---
		f("47_glass-entrance-double-door", 10, 14),
		f("51_indoor-planter-box", 8, 13, { offset: { x: 0.2, y: 0 } }),
		f("52_exterior-flower-planter", 13, 13, { offset: { x: -0.2, y: 0 } }),

		// --- Bebedouro / café (parede direita superior do salão) ---
		f("26_water-dispenser", 14, 7),
		f("34_coffee-machine", 14, 9),
	],
};
