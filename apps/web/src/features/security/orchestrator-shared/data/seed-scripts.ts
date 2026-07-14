// Biblioteca de scripts prontos (seed) — a "biblioteca compartilhada" que qualquer agent pode
// referenciar como ferramenta, em vez de redigitar comando/args toda vez.
import type { Script } from "../types";

const ISO = "2026-07-08T10:00:00.000Z";

export const seedScripts = (): Script[] => [
	{
		id: "predefined-run-tests",
		name: "Rodar testes",
		description: "Executa a suíte de testes do projeto.",
		kind: "command",
		command: "npm",
		args: ["test"],
		createdAt: ISO,
		updatedAt: ISO,
	},
	{
		id: "predefined-lint",
		name: "Lint",
		description: "Roda o linter no projeto.",
		kind: "command",
		command: "npm",
		args: ["run", "lint"],
		createdAt: ISO,
		updatedAt: ISO,
	},
	{
		id: "predefined-build",
		name: "Build",
		description: "Compila o projeto.",
		kind: "command",
		command: "npm",
		args: ["run", "build"],
		createdAt: ISO,
		updatedAt: ISO,
	},
	{
		id: "predefined-git-status",
		name: "Git status",
		description: "Mostra o estado atual do repositório.",
		kind: "command",
		command: "git",
		args: ["status"],
		createdAt: ISO,
		updatedAt: ISO,
	},
];
