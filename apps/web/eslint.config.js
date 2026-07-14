// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["dist"]), // Regra geral
	{
		files: ["**/*.{ts,tsx}"],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		rules: {
			"react-refresh/only-export-components": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			"max-len": [
				"error",
				{
					code: 120,
					tabWidth: 2,
					ignoreUrls: true,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
					ignoreComments: false,
				},
			],
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@/components/ui/file/*"],
							message: "Importe apenas de '@/components/ui/file' (barrel).",
						},
					],
				},
			],
		},
	},
	{
		files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
		rules: {
			"func-style": ["error", "expression"],
		},
	},
	...storybook.configs["flat/recommended"],
]);
