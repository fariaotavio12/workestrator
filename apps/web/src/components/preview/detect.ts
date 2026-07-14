/** Extrai HTML autocontido de um texto (bloco ```html``` ou documento completo). `null` se não houver. */
export const extractHtml = (content: string): string | null => {
	const fenced = content.match(/```html\s*\n([\s\S]*?)```/i);
	if (fenced) return fenced[1].trim();
	if (/<!doctype html>|<html[\s>]/i.test(content)) return content;
	return null;
};
