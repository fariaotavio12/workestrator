import { appBrand } from "@/app/config/branding";

export type PageMetadata = {
	title: string;
	description: string;
	keywords?: string[];
	ogImage?: string;
	canonical?: string;
	robots?: "index, follow" | "noindex, nofollow";
};

const SITE_URL = appBrand.siteUrl;
const SITE_NAME = appBrand.name;
const DEFAULT_DESCRIPTION = appBrand.description;

const defaultMetadata: PageMetadata = {
	title: SITE_NAME,
	description: DEFAULT_DESCRIPTION,
	keywords: appBrand.defaultKeywords,
	ogImage: appBrand.ogImage,
	canonical: `${SITE_URL}/`,
	robots: "index, follow",
};

const routeMetadata: Record<string, PageMetadata> = {
	"/": {
		title: SITE_NAME,
		description: DEFAULT_DESCRIPTION,
		keywords: appBrand.defaultKeywords,
		canonical: `${SITE_URL}/`,
		robots: "index, follow",
	},
	"/precos": {
		title: `Preços - ${SITE_NAME}`,
		description: "Página de preços pronta para adaptação ao modelo comercial do produto.",
		keywords: ["preços", "planos", "assinatura", "template"],
		canonical: `${SITE_URL}/precos`,
		robots: "index, follow",
	},
	"/download": {
		title: `Download - ${SITE_NAME}`,
		description: "Página pública para disponibilizar downloads ou materiais do produto.",
		keywords: ["download", "web app", "template"],
		canonical: `${SITE_URL}/download`,
		robots: "index, follow",
	},
	"/politica-de-privacidade": {
		title: `Política de Privacidade - ${SITE_NAME}`,
		description: "Modelo de política de privacidade para adaptar ao produto final.",
		canonical: `${SITE_URL}/politica-de-privacidade`,
		robots: "index, follow",
	},
	"/help-center/introducao": {
		title: `Central de Ajuda - ${SITE_NAME}`,
		description: "Base inicial para guias, tutoriais e documentação do produto.",
		canonical: `${SITE_URL}/help-center/introducao`,
		robots: "index, follow",
	},
	"/help-center/faq": {
		title: `FAQ - ${SITE_NAME}`,
		description: "Perguntas frequentes sobre o produto.",
		canonical: `${SITE_URL}/help-center/faq`,
		robots: "index, follow",
	},
	"/login": {
		title: `Login - ${SITE_NAME}`,
		description: "Acesse sua conta.",
		canonical: `${SITE_URL}/login`,
		robots: "noindex, nofollow",
	},
	"/registrar": {
		title: `Criar Conta - ${SITE_NAME}`,
		description: "Crie sua conta.",
		canonical: `${SITE_URL}/registrar`,
		robots: "noindex, nofollow",
	},
	"/recuperar-senha": {
		title: `Recuperar Senha - ${SITE_NAME}`,
		description: "Recupere o acesso da sua conta.",
		canonical: `${SITE_URL}/recuperar-senha`,
		robots: "noindex, nofollow",
	},
	"/completar-cadastro": {
		title: `Completar Cadastro - ${SITE_NAME}`,
		description: "Finalize seu cadastro.",
		canonical: `${SITE_URL}/completar-cadastro`,
		robots: "noindex, nofollow",
	},
	"/subscription/success": {
		title: `Assinatura Confirmada - ${SITE_NAME}`,
		description: "Sua assinatura foi concluída com sucesso.",
		canonical: `${SITE_URL}/subscription/success`,
		robots: "noindex, nofollow",
	},
	"/subscription/cancel": {
		title: `Assinatura Cancelada - ${SITE_NAME}`,
		description: "A assinatura foi cancelada.",
		canonical: `${SITE_URL}/subscription/cancel`,
		robots: "noindex, nofollow",
	},
};

const upsertMetaByName = (name: string, content: string) => {
	let element = document.querySelector(`meta[name="${name}"]`);
	if (!element) {
		element = document.createElement("meta");
		element.setAttribute("name", name);
		document.head.appendChild(element);
	}
	element.setAttribute("content", content);
};

const upsertMetaByProperty = (property: string, content: string) => {
	let element = document.querySelector(`meta[property="${property}"]`);
	if (!element) {
		element = document.createElement("meta");
		element.setAttribute("property", property);
		document.head.appendChild(element);
	}
	element.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
	let element = document.querySelector('link[rel="canonical"]');
	if (!element) {
		element = document.createElement("link");
		element.setAttribute("rel", "canonical");
		document.head.appendChild(element);
	}
	element.setAttribute("href", href);
};

const upsertLink = (selector: string, attributes: Record<string, string>) => {
	let element = document.querySelector(selector);
	if (!element) {
		element = document.createElement("link");
		document.head.appendChild(element);
	}

	Object.entries(attributes).forEach(([key, value]) => {
		element.setAttribute(key, value);
	});
};

const applyBrandDocumentAssets = () => {
	upsertMetaByName("author", appBrand.shortName);
	upsertMetaByName("apple-mobile-web-app-title", appBrand.shortName);
	upsertMetaByProperty("og:site_name", appBrand.name);

	upsertLink('link[rel="icon"][sizes="any"]', { rel: "icon", href: appBrand.favicon.ico, sizes: "any" });
	upsertLink('link[rel="icon"][type="image/png"]', {
		rel: "icon",
		type: "image/png",
		href: appBrand.favicon.png,
		sizes: "96x96",
	});
	upsertLink('link[rel="icon"][type="image/svg+xml"]', {
		rel: "icon",
		type: "image/svg+xml",
		href: appBrand.favicon.svg,
	});
	upsertLink('link[rel="shortcut icon"]', { rel: "shortcut icon", href: appBrand.favicon.ico });
	upsertLink('link[rel="apple-touch-icon"]', {
		rel: "apple-touch-icon",
		href: appBrand.favicon.apple,
		sizes: "180x180",
	});
	upsertLink('link[rel="manifest"]', { rel: "manifest", href: appBrand.favicon.manifest });
};

export const resolveMetadataByPath = (pathname: string): PageMetadata => {
	const decodedPathname = (() => {
		try {
			return decodeURIComponent(pathname);
		} catch {
			return pathname;
		}
	})();

	if (decodedPathname.startsWith("/dashboard") || decodedPathname.startsWith("/admin")) {
		return {
			title: `${SITE_NAME} Dashboard`,
			description: DEFAULT_DESCRIPTION,
			canonical: `${SITE_URL}${pathname}`,
			robots: "noindex, nofollow",
		};
	}

	if (decodedPathname.startsWith("/help-center/") && !routeMetadata[decodedPathname]) {
		return {
			title: `Central de Ajuda - ${SITE_NAME}`,
			description: "Guias e tutoriais para adaptar a central de ajuda ao produto final.",
			canonical: `${SITE_URL}${pathname}`,
			robots: "index, follow",
		};
	}

	if (routeMetadata[decodedPathname]) {
		return routeMetadata[decodedPathname];
	}

	return {
		...defaultMetadata,
		canonical: `${SITE_URL}${pathname === "/" ? "" : pathname}`,
		robots: "noindex, nofollow",
	};
};

export const applyMetadataByPath = (pathname: string) => {
	const metadata = resolveMetadataByPath(pathname);

	applyBrandDocumentAssets();
	document.title = metadata.title;

	upsertMetaByName("description", metadata.description);
	upsertMetaByName("robots", metadata.robots ?? "index, follow");

	if (metadata.keywords?.length) {
		upsertMetaByName("keywords", metadata.keywords.join(", "));
	}

	upsertMetaByProperty("og:title", metadata.title);
	upsertMetaByProperty("og:description", metadata.description);
	upsertMetaByProperty("og:type", "website");
	upsertMetaByProperty("og:url", metadata.canonical ?? `${SITE_URL}${pathname}`);

	upsertMetaByName("twitter:title", metadata.title);
	upsertMetaByName("twitter:description", metadata.description);

	if (metadata.ogImage) {
		upsertMetaByProperty("og:image", metadata.ogImage);
		upsertMetaByName("twitter:image", metadata.ogImage);
	}

	upsertCanonical(metadata.canonical ?? `${SITE_URL}${pathname}`);
};
