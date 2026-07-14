import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type IconOption = {
	name: string;
	label: string;
	Icon: LucideIcon;
};

export const toKebabCase = (value: string) =>
	value
		.replace(/Icon$/, "")
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();

const toTitle = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const isLucideIcon = (value: unknown): value is LucideIcon =>
	typeof value === "object" && value !== null && "render" in value && "$$typeof" in value;

const lucideEntries = Object.entries(LucideIcons)
	.filter(([exportName, value]) => {
		if (!/^[A-Z]/.test(exportName)) return false;
		// `Icon` é o componente-base do lucide-react: exige a prop `iconNode` e,
		// renderizado sem ela, executa `iconNode.map(...)` sobre undefined (crash).
		// Não é um ícone concreto, então fica fora da lista.
		if (exportName === "Icon") return false;
		return isLucideIcon(value);
	})
	.map(([exportName, Icon]) => ({
		name: toKebabCase(exportName),
		label: toTitle(toKebabCase(exportName)),
		Icon: Icon as LucideIcon,
	}))
	.sort((current, next) => current.label.localeCompare(next.label));

export const LUCIDE_ICON_OPTIONS: IconOption[] = Array.from(
	new Map(lucideEntries.map((option) => [option.name, option])).values(),
);

export const getLucideIcon = (name: string): LucideIcon | undefined =>
	LUCIDE_ICON_OPTIONS.find((option) => option.name === name)?.Icon;
