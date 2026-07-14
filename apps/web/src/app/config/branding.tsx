import { IconfavIcon } from "@/app/assets/icons";
import { cn } from "@/app/utils/cn";
import type { ComponentProps, ComponentType } from "react";

type BrandIconProps = ComponentProps<typeof IconfavIcon>;

const WorkestratorIcon = ({ className, width, height }: BrandIconProps) => (
	<img
		src={`${import.meta.env.BASE_URL}icon-192.png`}
		alt="Workestrator"
		width={typeof width === "number" ? width : undefined}
		height={typeof height === "number" ? height : undefined}
		className={cn("rounded-lg object-cover", className)}
	/>
);

type BrandConfig = {
	name: string;
	shortName: string;
	description: string;
	siteUrl: string;
	ogImage: string;
	defaultKeywords: string[];
	demoEmail: string;
	companyPlaceholder: string;
	footerDescription: string;
	favicon: {
		ico: string;
		png: string;
		svg: string;
		apple: string;
		manifest: string;
	};
	Icon: ComponentType<BrandIconProps>;
};

export const brandVariants = {
	"workestrator": {
		name: "Workestrator",
		shortName: "Workestrator",
		description:
			"Console para coordenar squads de agentes de IA de múltiplos provedores: crie agentes, monte equipes, defina fluxos e acompanhe execuções.",
		siteUrl: "https://workestrator.zappyon.com",
		ogImage: "https://workestrator.zappyon.com/og-image.jpg",
		defaultKeywords: ["workestrator", "agentes de ia", "squads", "automacao", "workflow"],
		demoEmail: "usuário@workestrator.dev",
		companyPlaceholder: "Workestrator Tecnologia Ltda.",
		footerDescription: "Central de comando para squads de agentes de IA.",
		// `import.meta.env.BASE_URL` (não string crua começando com "/"): `seo.ts` reescreve esses
		// <link> em runtime a cada troca de rota, e no build do Electron ("/") vira raiz do sistema
		// de arquivos sob `file://`, quebrando o favicon.
		favicon: {
			ico: `${import.meta.env.BASE_URL}favicon.ico`,
			png: `${import.meta.env.BASE_URL}favicon-96x96.png`,
			svg: `${import.meta.env.BASE_URL}favicon.svg`,
			apple: `${import.meta.env.BASE_URL}apple-touch-icon.png`,
			manifest: `${import.meta.env.BASE_URL}site.webmanifest`,
		},
		Icon: WorkestratorIcon,
	},
} satisfies Record<string, BrandConfig>;

export type BrandKey = keyof typeof brandVariants;

export const activeBrandKey: BrandKey = "workestrator";
export const appBrand = brandVariants[activeBrandKey];
export const AppBrandIcon = appBrand.Icon;
