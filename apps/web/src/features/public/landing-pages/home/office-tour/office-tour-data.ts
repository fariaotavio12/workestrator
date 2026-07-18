import { personSrc, type PersonKey } from "@/features/security/orchestrator-shared/data/characters";

export type StationAccent = "primary" | "violet" | "rose" | "blue" | "orange" | "warning" | "success" | "gold";

export type Station = {
	num: string;
	label: string;
	accent: StationAccent;
	avatar: PersonKey;
	/** Estação sem NPC fixo — é onde o jogador (orquestrador) fica. */
	isPlayerStation: boolean;
	quote: string;
	subtitle: string;
};

/**
 * Um `PersonKey` por estação, sem repetir nenhum dos 7 sprites físicos do escritório — inclusive o do
 * "gerente" (normalmente reservado ao coordenador nos squads), já que aqui ele é o próprio jogador.
 */
export const stations: Station[] = [
	{
		num: "01",
		label: "ORQUESTRADOR",
		accent: "primary",
		avatar: "01_manager-navy",
		isPlayerStation: true,
		quote: "Eu decido, a cada passo, quem age. Bora conhecer o time.",
		subtitle: "Sem pipeline fixo — a cada passo, o orquestrador escolhe quem trabalha.",
	},
	{
		num: "02",
		label: "SQUADS",
		accent: "violet",
		avatar: "02_orange-yellow",
		isPlayerStation: false,
		quote: "Um escritório por squad: cada agente senta numa cadeira e trabalha junto.",
		subtitle: "Monte quantos squads quiser, cada um com seu time e seu contexto.",
	},
	{
		num: "03",
		label: "AGENTS",
		accent: "rose",
		avatar: "03_dark-purple",
		isPlayerStation: false,
		quote: "Nome, papel, prompt, personagem e regras — tudo configurável.",
		subtitle: "Cada agente é explícito. Nada de caixa-preta.",
	},
	{
		num: "04",
		label: "MODELOS",
		accent: "blue",
		avatar: "04_brown-green",
		isPlayerStation: false,
		quote: "Conecte qualquer provider: Claude, GPT, Gemini ou modelo local.",
		subtitle: "Misture modelos no mesmo squad — um por agente.",
	},
	{
		num: "05",
		label: "SCRIPTS",
		accent: "orange",
		avatar: "05_black-charcoal",
		isPlayerStation: false,
		quote: "Uma biblioteca de ferramentas que qualquer agente pode usar.",
		subtitle: "Escreva uma vez; o time inteiro reaproveita.",
	},
	{
		num: "06",
		label: "CHECKPOINTS",
		accent: "warning",
		avatar: "06_blond-blue",
		isPlayerStation: false,
		quote: "Alguns passos pausam e esperam a sua aprovação.",
		subtitle: "Nada roda sem você.",
	},
	{
		num: "07",
		label: "EXECUÇÕES",
		accent: "success",
		avatar: "07_brown-red",
		isPlayerStation: false,
		quote: "Acompanhe cada passo: quem agiu, o que fez, o que custou.",
		subtitle: "Tudo client-side, direto no seu navegador.",
	},
	{
		num: "08",
		label: "FIM DA VISITA",
		accent: "gold",
		avatar: "01_manager-navy",
		isPlayerStation: true,
		quote: "Chegamos ao baú. Daqui pra frente, o escritório é seu.",
		subtitle: "Monte o primeiro squad e deixe o orquestrador trabalhar.",
	},
];

export { personSrc };

/**
 * Largura "raw" (px, escala 1x) do sprite do escritório — todos os 7 têm a mesma proporção (~40×82),
 * então uma constante única basta (a altura acompanha sozinha via o aspect ratio nativo do PNG).
 */
export const PERSON_WIDTH = 42;

type FurnitureName =
	| "desk_wood"
	| "desktop_set_blue"
	| "desktop_set_violet"
	| "desktop_set_rose"
	| "desktop_set_green"
	| "desktop_set_amber"
	| "chair"
	| "monstera"
	| "plant1"
	| "fancy_rug"
	| "whiteboard"
	| "bookshelf"
	| "couch"
	| "lamp_tan"
	| "window_blinds_open"
	| "treasurechest_closed_gold"
	| "treasurechest_open_gold"
	| "clock"
	| "frame_landscape"
	| "poster"
	| "mug"
	| "papers";

/** Largura/altura "raw" (px, escala 1x) de cada peça de mobília. */
export const FURNITURE_SIZE: Record<FurnitureName, [number, number]> = {
	desk_wood: [64, 34],
	desktop_set_blue: [34, 26],
	desktop_set_violet: [34, 26],
	desktop_set_rose: [34, 26],
	desktop_set_green: [34, 26],
	desktop_set_amber: [34, 26],
	chair: [22, 30],
	monstera: [34, 48],
	plant1: [18, 28],
	fancy_rug: [96, 18],
	whiteboard: [56, 44],
	bookshelf: [44, 62],
	couch: [64, 32],
	lamp_tan: [18, 54],
	window_blinds_open: [46, 56],
	treasurechest_closed_gold: [44, 34],
	treasurechest_open_gold: [44, 40],
	clock: [14, 14],
	frame_landscape: [16, 20],
	poster: [20, 26],
	mug: [8, 8],
	papers: [12, 7],
};

export const furnitureSrc = (name: FurnitureName) => `/assets/furniture/${name}.png`;

export type Sprite = {
	src: string;
	left: number;
	width: number;
	bottom: string;
	z: number;
	flip?: -1 | 1;
};

/**
 * Layout do mundo (posições absolutas em px), gerado a partir da largura/altura do viewport e da
 * escala de pixel-art. Ported 1:1 da versão dc — cada estação tem seu próprio conjunto de móveis.
 */
export const buildWorld = (vw: number, pixelScale: number) => {
	const SC = vw < 560 ? Math.min(pixelScale, 2.2) : vw < 960 ? Math.min(pixelScale, 2.6) : pixelScale;
	const stationSpan = Math.min(Math.max(920, vw * 0.92), 1400);
	const x0 = vw * 0.42;
	const xs = stations.map((_, i) => Math.round(x0 + i * stationSpan));
	const lastIndex = xs.length - 1;
	const worldWidth = xs[lastIndex] + vw * 0.78;
	const d = (v: number) => Math.round((v * SC) / 3);

	const floor = "21%";
	const rug = "19.7%";
	const deskTop = `calc(21% + ${Math.round(28 * SC)}px)`;
	const seated = `calc(21% + ${Math.round(11 * SC)}px)`;

	const furniture: Sprite[] = [];
	const addFurniture = (
		name: FurnitureName,
		stationIndex: number,
		dx: number,
		bottom: string,
		z: number,
		flip: -1 | 1 = 1,
	) =>
		furniture.push({
			src: furnitureSrc(name),
			left: xs[stationIndex] + d(dx),
			width: FURNITURE_SIZE[name][0] * SC,
			bottom,
			z,
			flip,
		});

	const npcs: Sprite[] = [];
	const addNpc = (name: PersonKey, stationIndex: number, dx: number, bottom: string, z: number, flip: -1 | 1 = 1) =>
		npcs.push({
			src: personSrc(name, "front"),
			left: xs[stationIndex] + d(dx),
			width: PERSON_WIDTH * SC * 0.92,
			bottom,
			z,
			flip,
		});

	// 01 — mesa do orquestrador
	addFurniture("fancy_rug", 0, 0, rug, 1);
	addFurniture("chair", 0, -100, floor, 2);
	addFurniture("desk_wood", 0, 150, floor, 4);
	addFurniture("desktop_set_blue", 0, 150, deskTop, 5);
	addFurniture("mug", 0, 215, deskTop, 5);
	addFurniture("monstera", 0, -245, floor, 3);
	addFurniture("lamp_tan", 0, 330, floor, 2);

	// 02 — squads: dois postos ocupados
	addFurniture("fancy_rug", 1, 10, rug, 1);
	addFurniture("chair", 1, -218, floor, 2);
	addNpc("04_brown-green", 1, -158, seated, 3);
	addFurniture("desk_wood", 1, -168, floor, 4);
	addFurniture("desktop_set_violet", 1, -168, deskTop, 5);
	addFurniture("chair", 1, 238, floor, 2, -1);
	addNpc("06_blond-blue", 1, 198, seated, 3, -1);
	addFurniture("desk_wood", 1, 188, floor, 4);
	addFurniture("desktop_set_green", 1, 188, deskTop, 5);
	addFurniture("plant1", 1, 330, floor, 2);

	// 03 — agents: whiteboard de configuração
	addFurniture("whiteboard", 2, -185, floor, 3);
	addFurniture("poster", 2, 185, "50%", 1);
	addFurniture("plant1", 2, 315, floor, 2);

	// 04 — modelos: estante + mesa com dois desktops (providers)
	addFurniture("bookshelf", 3, -205, floor, 3);
	addFurniture("desk_wood", 3, 185, floor, 4);
	addFurniture("desktop_set_blue", 3, 152, deskTop, 5);
	addFurniture("desktop_set_rose", 3, 222, deskTop, 5);

	// 05 — scripts: bancada de ferramentas
	addFurniture("desk_wood", 4, -180, floor, 4);
	addFurniture("desktop_set_amber", 4, -196, deskTop, 5);
	addFurniture("papers", 4, -136, deskTop, 5);
	addFurniture("mug", 4, -110, deskTop, 5);
	addFurniture("frame_landscape", 4, 200, "54%", 1);
	addFurniture("plant1", 4, 265, floor, 2);

	// 06 — checkpoints: sala de espera
	addFurniture("couch", 5, -215, floor, 3);
	addFurniture("lamp_tan", 5, -338, floor, 2);
	addFurniture("clock", 5, 195, "58%", 1);
	addFurniture("papers", 5, -215, `calc(21% + ${Math.round(20 * SC)}px)`, 4);

	// 07 — execuções: reta final
	addFurniture("fancy_rug", 6, 180, rug, 1);
	addFurniture("monstera", 6, 455, floor, 3);

	// fundo (parallax 0.35): janelas e parede
	const background: Sprite[] = [];
	const backgroundSeq: [FurnitureName, string][] = [
		["window_blinds_open", "44%"],
		["poster", "52%"],
		["clock", "60%"],
		["frame_landscape", "53%"],
		["window_blinds_open", "44%"],
		["frame_landscape", "56%"],
	];
	const span = worldWidth * 0.35 + vw + 400;
	const backgroundStep = d(430);
	for (let x = Math.round(vw * 0.72), k = 0; x < span; x += backgroundStep, k++) {
		const [name, bottom] = backgroundSeq[k % backgroundSeq.length];
		background.push({ src: furnitureSrc(name), left: x, width: FURNITURE_SIZE[name][0] * SC * 0.9, bottom, z: 0 });
	}

	// frente (parallax 1.22)
	const foreground: Sprite[] = [];
	(
		[
			[0.5, "monstera"],
			[2.4, "plant1"],
			[3.6, "monstera"],
			[5.45, "plant1"],
		] as [number, FurnitureName][]
	).forEach(([p, name]) => {
		foreground.push({
			src: furnitureSrc(name),
			left: Math.round((x0 + p * stationSpan) * 1.22),
			width: FURNITURE_SIZE[name][0] * SC * 1.75,
			bottom: "9%",
			z: 0,
		});
	});

	const chestWidth = FURNITURE_SIZE.treasurechest_closed_gold[0] * SC;

	return {
		xs,
		lastIndex,
		worldWidth,
		scale: SC,
		scrollable: Math.max(0, worldWidth - vw),
		furniture: [...furniture, ...npcs],
		background,
		foreground,
		chestLeft: xs[lastIndex] + d(180),
		chestWidth,
	};
};

export type World = ReturnType<typeof buildWorld>;
