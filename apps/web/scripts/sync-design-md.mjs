import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const designPath = path.join(root, "DESIGN.md");
const tsOutputPath = path.join(root, "src", "app", "design", "design-md.generated.ts");
const cssOutputPath = path.join(root, "src", "app", "design", "design-md.generated.css");

const source = fs.readFileSync(designPath, "utf8");
const { data } = matter(source);

const entries = (value = {}) =>
	Object.entries(value).map(([name, tokenValue]) => ({
		name,
		value: String(tokenValue),
	}));

const compactEntries = (value = {}) =>
	Object.fromEntries(Object.entries(value).map(([name, tokenValue]) => [name, String(tokenValue)]));

const componentEntries = (value = {}) =>
	Object.entries(value).map(([name, component]) => ({
		name,
		token: String(component?.token ?? ""),
		usage: String(component?.usage ?? ""),
	}));

const design = {
	name: String(data.name ?? "Project Design"),
	description: String(data.description ?? ""),
	colors: entries(data.colors),
	darkColors: entries(data.darkColors),
	typography: entries(data.typography),
	radii: entries(data.radii),
	components: componentEntries(data.components),
};

const toCssVars = (tokens = {}) =>
	Object.entries(tokens)
		.map(([name, value]) => `\t--${name}: ${value};`)
		.join("\n");

const toPrefixedCssVars = (tokens = {}, prefix) =>
	Object.entries(tokens)
		.map(([name, value]) => `\t--${prefix}-${name}: ${value};`)
		.join("\n");

const sharedAliases = (colors = {}) => {
	const aliases = {
		popover: colors.card ?? colors.background,
		"popover-foreground": colors["card-foreground"] ?? colors.foreground,
		"input-border": colors["input-border"] ?? colors.border,
	};

	return Object.entries(aliases)
		.filter(([, value]) => Boolean(value))
		.map(([name, value]) => `\t--${name}: ${value};`)
		.join("\n");
};

const tsFile = `export const designMd = ${JSON.stringify(design, null, "\t")} as const;\n`;

const systemColors = compactEntries(data.colors);
const systemDarkColors = compactEntries(data.darkColors);
const systemTypography = compactEntries(data.typography);
const systemRadii = compactEntries(data.radii);

const cssFile = `:root {
${toPrefixedCssVars(systemColors, "design")}
${toPrefixedCssVars(systemTypography, "design-typography")}
${toPrefixedCssVars(systemRadii, "design-radius")}
}

.dark {
${toPrefixedCssVars(systemDarkColors, "design")}
}

.design-md-scope {
${toCssVars(data.colors)}
${sharedAliases(data.colors)}
}

.dark .design-md-scope {
${toCssVars(data.darkColors)}
${sharedAliases(data.darkColors)}
}
`;

fs.mkdirSync(path.dirname(tsOutputPath), { recursive: true });
fs.writeFileSync(tsOutputPath, tsFile, "utf8");
fs.writeFileSync(cssOutputPath, cssFile, "utf8");

console.log("Generated DESIGN.md tokens:");
console.log(`- ${path.relative(root, tsOutputPath)}`);
console.log(`- ${path.relative(root, cssOutputPath)}`);
