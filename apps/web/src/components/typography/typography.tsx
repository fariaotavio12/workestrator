import { cn } from "@/app/utils/cn";
import { type ElementType, type HTMLAttributes } from "react";

export type TypographyVariant =
	// DESIGN.md tokens — display (usa --font-display)
	| "display-xl"
	| "display-lg"
	| "display-md"
	| "display-sm"
	// DESIGN.md tokens — texto
	| "title-lg"
	| "title-md"
	| "title-sm"
	| "body-md"
	| "body-sm"
	| "caption"
	| "button"
	| "nav-link"
	// custom project tokens
	| "hero-title"
	| "hero-description"
	| "section-label"
	| "section-heading"
	| "section-intro"
	| "ui-header"
	| "inline-link";

const defaultElement: Record<TypographyVariant, ElementType> = {
	"display-xl": "h1",
	"display-lg": "h2",
	"display-md": "h3",
	"display-sm": "h4",
	"title-lg": "h3",
	"title-md": "h4",
	"title-sm": "h5",
	"body-md": "p",
	"body-sm": "p",
	"caption": "span",
	"button": "span",
	"nav-link": "span",
	"hero-title": "h1",
	"hero-description": "p",
	"section-label": "p",
	"section-heading": "h2",
	"section-intro": "p",
	"ui-header": "h4",
	"inline-link": "a",
};

type TypographyProps = HTMLAttributes<HTMLElement> & {
	variant?: TypographyVariant;
	as?: ElementType;
};

export function Typography({ variant = "body-md", as, className, ...props }: TypographyProps) {
	const Tag = as ?? defaultElement[variant];
	return <Tag className={cn(variant, className)} {...props} />;
}
