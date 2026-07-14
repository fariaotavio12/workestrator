import type { ConfigAssistantMessage } from "@/features/security/orchestrator-shared/model";

export const extractHtml = (content: string): string | null => {
	const fenced = content.match(/```html\s*\n([\s\S]*?)```/i);
	if (fenced) return fenced[1].trim();
	if (/<!doctype html>|<html[\s>]/i.test(content)) return content;
	return null;
};

export const fileNameFromPatch = (name: string) => name.replace(/^[ab]\//, "");

export const deriveTitle = (messages: Pick<ConfigAssistantMessage, "role" | "content">[]): string => {
	const firstUser = messages.find((message) => message.role === "user");
	const base = firstUser?.content.trim() ?? "Nova conversa";
	return base.length > 60 ? `${base.slice(0, 60)}...` : base;
};

export const orchApi = () => window.__ORCH_API__;
