import { z } from "zod";

export const PROMPT_LANGUAGES = [
	{ value: "pt-BR", label: "Portugues (BR)" },
	{ value: "en", label: "Ingles (EN)" },
] as const;
export type PromptLanguage = (typeof PROMPT_LANGUAGES)[number]["value"];

export type ClarifyingQuestion = { id: string; question: string; hint?: string };
export type QuestionAnswer = { question: string; answer: string };
export type PromptGenerationInput = { name: string; role: string; brief: string };

export const MAX_CLARIFYING_QUESTIONS = 6;

const languageName = (language: PromptLanguage): string => (language === "en" ? "English" : "Brazilian Portuguese");

const orNotProvided = (value: string): string => {
	const trimmed = value.trim();
	return trimmed ? trimmed : "not provided";
};

// The meta-prompt below is itself structured in Anthropic's recommended order (Task context / Tone /
// Detailed task & rules / Examples / Output formatting). Its instructions never change with user input
// (only the JSON the model reads them against does), so this is a plain constant, not a builder.
export const QUESTIONS_SYSTEM_PROMPT = `## Task context
You are a senior prompt engineer specializing in system prompts for AI agents. In this step, your only job is to surface open questions: analyze the agent's name, role, and description provided by the user, and produce 3 to 6 clarifying questions whose answers will be used to write a high-quality system prompt following Anthropic's recommended prompt structure.

## Tone
Questions must be short, direct, and specific to this agent. Never generic.

## Detailed task & rules
- Ask ONLY about what is missing or ambiguous, prioritizing: tone and communication style; data, documents, or context the agent will have available; examples of expected input and output; exact response format (structure, length, fields); rules, constraints, and what the agent must NEVER do; edge cases and how to handle them.
- Do not ask about anything already clear from the description.
- The user's inputs are in Brazilian Portuguese; write every question and hint in Brazilian Portuguese as well.
- Produce between 3 and 6 questions, never more.

## Examples
Given the brief "revisa textos de marketing e aponta erros de tom", a good question is: {"id":"q1","question":"Existe algum guia de estilo ou tom de voz da marca que o agent deve seguir?","hint":"Ex.: informal, sem girias, frases curtas"}. A bad (generic) question is: "O que o agent deve fazer?".

## Output formatting
Respond ONLY with valid JSON — no text outside it, no markdown, no code fences — in this exact format:
{"questions":[{"id":"q1","question":"...","hint":"..."}]}
- "id": short unique identifier ("q1", "q2", ...).
- "question": the question in Brazilian Portuguese, ending with "?".
- "hint": optional, a short example of a possible answer.`;

export const buildQuestionsUserPrompt = (input: PromptGenerationInput, language: PromptLanguage): string =>
	`Generate the clarifying questions for the following agent, following the agreed JSON format exactly:

Agent name: "${orNotProvided(input.name)}"
Role: "${orNotProvided(input.role)}"
What it should do (user's own words, in Portuguese): ${input.brief.trim()}

Note: the final system prompt will be written in ${languageName(language)} later; the questions themselves must be in Brazilian Portuguese.`;

export const buildFinalSystemPrompt = (language: PromptLanguage): string =>
	`## Task context
You are a senior prompt engineer. Your task is to write the definitive system prompt for an AI agent, following Anthropic's recommended prompt structure. You will receive the agent's name, role, a description of what it should do, and optionally clarifications the user provided (all written in Brazilian Portuguese).

## Tone
The generated prompt must be direct, specific, and actionable, written in the second person ("You are...").

## Detailed task & rules
Structure the prompt in Markdown using "## " section headings, in this order:
1. Task context — who the agent is, its role and goal.
2. Tone — communication tone and style.
3. Background data — documents, data, and knowledge available to the agent.
4. Detailed task & rules — what to do (step by step when useful) and explicit rules and constraints, including what the agent must never do.
5. Examples — examples of expected input and output.
6. Conversation history — how to use history, if applicable.
7. Immediate request — what the agent must do on each invocation.
8. Step-by-step reasoning — instruction to think step by step before answering, when the task is complex.
9. Output formatting — exact response structure.

Mandatory rules:
- Skip (do not write) any section for which no information was provided — NEVER invent data, examples, or constraints.
- Always include, in the rules section, an explicit instruction that the agent must ask clarifying questions when a request is ambiguous or information is missing, instead of assuming.
- Write the ENTIRE prompt text in ${languageName(language)}, including all section headings.

## Output formatting
Respond ONLY with the system prompt text in Markdown. No preamble, no explanations, no code fences.`;

export const buildFinalUserPrompt = (input: PromptGenerationInput, answers: QuestionAnswer[]): string => {
	const answered = answers.filter((answer) => answer.answer.trim() !== "");
	const clarifications =
		answered.length > 0
			? answered.map((answer) => `- Q: ${answer.question}\n  A: ${answer.answer.trim()}`).join("\n")
			: "No additional clarifications were provided. Write the best possible prompt using only the information above, skipping sections without information.";

	return `Write the system prompt for the following agent:

Agent name: "${orNotProvided(input.name)}"
Role: "${orNotProvided(input.role)}"
What it should do (in Portuguese): ${input.brief.trim()}

Clarifications provided by the user (question followed by answer, in Portuguese):
${clarifications}`;
};

const clarifyingQuestionSchema = z.object({
	id: z.string().optional(),
	question: z.string().trim().min(1),
	hint: z.string().trim().optional(),
});

const clarifyingQuestionsResponseSchema = z.object({
	questions: z.array(clarifyingQuestionSchema).min(1),
});

/** Tolerant JSON extraction (survives fences/prose around it), same spirit as `parseAssistantAction` - never throws. */
export const parseClarifyingQuestions = (raw: string): ClarifyingQuestion[] | null => {
	const match = raw.match(/\{[\s\S]*\}/);
	if (!match) return null;

	try {
		const parsed: unknown = JSON.parse(match[0]);
		const result = clarifyingQuestionsResponseSchema.safeParse(parsed);
		if (!result.success) return null;

		// Ids are always regenerated (q1..qN) - never trust the model's own ids for uniqueness/order.
		return result.data.questions.slice(0, MAX_CLARIFYING_QUESTIONS).map((question, index) => ({
			id: `q${index + 1}`,
			question: question.question,
			hint: question.hint || undefined,
		}));
	} catch {
		return null;
	}
};
