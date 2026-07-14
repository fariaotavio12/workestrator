/**
 * @description Função para normalizar uma string, removendo acentos e caracteres especiais.
 * @param value Valor a ser normalizado.
 * @returns Valor normalizado.
 */
export const normalizeForSearch = (value: string): string => {
	return value
		.normalize("NFD") // separa letras dos acentos (ex.: á -> a + ´)
		.replace(/[\u0300-\u036f]/g, "") // remove acentos
		.toLowerCase() // converte tudo pra minúsculas
		.replace(/[_./-]+/g, " ") // substitui _ / - . por " "
		.replace(/\s+/g, " ") // colapsa espaços
		.trim(); // remove espaços do início e fim
}

export const numbersToRangeString = (ids: number[]) => {
	if (!ids || ids.length === 0) return "";

	const sortedIds = [...new Set(ids)].sort((a, b) => a - b);

	const ranges = [];
	let start = sortedIds[0];
	let end = sortedIds[0];

	for (let i = 1; i <= sortedIds.length; i++) {
		const current = sortedIds[i];

		if (current === end + 1) {
			end = current;
		} else {
			if (start === end) {
				ranges.push(`${start}`);
			} else {
				ranges.push(`${start}-${end}`);
			}

			start = current;
			end = current;
		}
	}

	return ranges.join(",");
}
