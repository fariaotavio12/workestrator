import { format, isValid, parseISO } from "date-fns";

export const parseIsoDate = (iso: string): Date => {
	// garante meia-noite local para evitar “pulos” por timezone
	return new Date(`${iso}T00:00:00`);
}

export const formatDatePtBR = (iso: string): string => {
	return parseIsoDate(iso).toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
	});
}

/**
 * @description Função que retorna as iniciais do primeiro e do último nome de uma pessoa em maiúsculo.
 * @param name Nome completo da pessoa.
 * @returns As iniciais do primeiro e do último nome da pessoa em maiúsculo.
 */
export const getNameInitials = (name: string): string => {
	if (!name) return "";

	const names = name.split(" ");
	if (names.length === 1) return names[0][0].toUpperCase();

	const firstInitial = names[0][0];
	const lastInitial = names[names.length - 1][0];
	return `${firstInitial}${lastInitial}`.toUpperCase();
};

/**
 * @description Função que retorna o primeiro e o último nome de uma pessoa.
 * @param name Nome completo da pessoa.
 * @returns O primeiro e o último nome da pessoa.
 */
export const getFirstAndLastName = (name: string): string => {
	if (!name) return "";

	const names = name.split(" ");
	if (names.length === 1) return names[0];

	return `${names[0]} ${names[names.length - 1]}`;
};

/**
 * @description Função que transforma um texto em formato de título.
 * @param text Texto a ser transformado.
 * @returns Texto em formato de título.
 */
export const turnIntoTitleCase = (text: string): string => {
	return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * @description Função que retorna apenas o primeiro nome de uma pessoa.
 * @param name Nome completo da pessoa.
 * @returns O primeiro nome da pessoa.
 */
export const getFirstName = (name: string): string => {
	if (!name) return "";

	const names = name.split(" ");
	return names[0];
};

/**
 * @description Função para truncar o nome de um arquivo.
 * @param fileName Nome do arquivo.
 * @param maxLength Tamanho máximo do nome do arquivo.
 * @returns Nome do arquivo truncado, preservando a extensão.
 */
export const truncateFileName = (fileName: string, maxLength: number = 20): string => {
	const fileNameSplited = fileName.split(".");
	const fileNameWithoutExtension = fileNameSplited[0];
	const fileNameExtension = fileNameSplited[1];

	if (fileNameWithoutExtension.length > maxLength) {
		const fileNameTruncated = fileNameWithoutExtension.substring(0, maxLength);
		return `${fileNameTruncated}...${fileNameExtension}`;
	}

	return fileName;
};

/**
 * @description Função para converter uma data (string ou Date) para o formato de data brasileiro (dd/MM/yyyy).
 * @param date Data a ser formatada.
 * @returns Data formatada no padrão brasileiro (dd/MM/yyyy).
 */
export const formatToBRDateString = (date: string | Date): string => {
	if (!date) return ""; // só adicionei essa linha aqui

	let dateObj: Date;

	if (typeof date === "string") {
		dateObj = parseISO(date);
		if (!isValid(dateObj)) {
			throw new Error("String de data inválida");
		}
	} else {
		dateObj = date;
	}

	return format(dateObj, "dd/MM/yyyy");
};

/**
 * @description Função para converter uma data (string ou Date) para o formato ISO (yyyy-MM-dd).
 * @param date Data a ser formatada.
 * @returns Data formatada no padrão ISO (yyyy-MM-dd).
 */
export const formatToISODateString = (date: string | Date): string => {
	let dateObj: Date;

	if (typeof date === "string") {
		dateObj = parseISO(date);
		if (!isValid(dateObj)) {
			throw new Error("String de data inválida");
		}
	} else {
		dateObj = date;
	}

	return format(dateObj, "yyyy-MM-dd");
};

/**
 * @description Função para formatar um número de telefone.
 * @param phoneNumber Número de celular ou fixo a ser formatado.
 * @returns Número de telefone formatado ou mensagem de número inválido.
 */
export const formatPhone = (phoneNumber: string): string => {
	if (!phoneNumber) return "Número inválido";

	const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");

	if (cleanedPhoneNumber.length === 11) {
		if (!/^(\d{2})9(\d{4})(\d{4})$/.test(cleanedPhoneNumber)) {
			return "Número inválido";
		}

		return cleanedPhoneNumber.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2$3-$4");
	} else if (cleanedPhoneNumber.length === 10) {
		if (!/^(\d{2})(\d{4})(\d{4})$/.test(cleanedPhoneNumber)) {
			return "Número inválido";
		}

		return cleanedPhoneNumber.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
	} else if (cleanedPhoneNumber.length === 9) {
		if (!/^9(\d{4})(\d{4})$/.test(cleanedPhoneNumber)) {
			return "Número inválido";
		}
		return cleanedPhoneNumber.replace(/9(\d{4})(\d{4})/, "9$1-$2");
	} else if (cleanedPhoneNumber.length === 8) {
		if (!/^(\d{4})(\d{4})$/.test(cleanedPhoneNumber)) {
			return "Número inválido";
		}
		return cleanedPhoneNumber.replace(/(\d{4})(\d{4})/, "$1-$2");
	} else {
		return "Número inválido";
	}
};

/**
 * @description Função para formatar um CPF
 * @param cpf CPF a ser formatado.
 * @returns CPF formatado.
 */
export const formatCpf = (cpf: string): string => {
	if (!cpf) return "";
	const cleanedCpf = cpf.replace(/\D/g, "");

	const formattedCpf = cleanedCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

	return formattedCpf;
};

/**
 * @description Função para formatar um CNPJ.
 * @param cnpj CNPJ a ser formatado.
 * @returns CNPJ formatado.
 */
export const formatCnpj = (cnpj: string): string => {
	if (!cnpj) return "";
	const cleanedCnpj = cnpj.replace(/\D/g, "");

	const formattedCnpj = cleanedCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

	return formattedCnpj;
};

/**
 * @description Função para remover acentos de uma string.
 * @param text Texto a ser formatado.
 * @returns Texto sem acentos.
 */
export const removeAccents = (text: string): string => {
	return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * @description Função para formatar um valor monetário no padrão brasileiro.
 * @param value Valor a ser formatado.
 * @returns Valor formatado no padrão brasileiro.
 */
export const formatBRLMoney = (value: number): string => {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);
};

export const toCapitalize = (str: string) => {
	if (str == undefined) return;

	return str
		.toLowerCase()
		.split(" ")
		.map((word) => {
			if (word.length === 0) return word;

			// Remove acentos apenas da primeira letra para capitalização
			const firstChar = word[0];
			const normalizedFirstChar = firstChar.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

			const capitalizedFirstChar = normalizedFirstChar.toUpperCase();

			// Se o caractere original tinha acento, mantemos o acento
			if (firstChar !== normalizedFirstChar) {
				return capitalizedFirstChar + word.slice(1);
			}

			return capitalizedFirstChar + word.slice(1);
		})
		.join(" ");
}

export const formatarDataHora = (dataString: string) => {
	const data = new Date(dataString);

	return {
		data: data.toLocaleDateString("pt-BR"), // 26/10/2025
		hora: data.toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}), // 13:41:35
		dataISO: data.toISOString().split("T")[0], // 2025-10-26
		horaSimples: data.toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
		}), // 13:41
	};
};

export const truncateText = (text: string, maxLength: number): string => {
	return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const unmaskCurrency = (value: string): string => {
	let unmaskedValue = value.replace(/[^\d,.-]/g, "");
	unmaskedValue = unmaskedValue.replace(/\./g, "").replace(/,/g, ".");

	if (/^\./.test(unmaskedValue)) unmaskedValue = "0" + unmaskedValue;
	if (/^\d$/.test(unmaskedValue)) unmaskedValue = unmaskedValue + ".00";

	return unmaskedValue;
};

export const maskCurrency = (value: string): string => {
	const maskedValue = value
		.replace(/\D/g, "")
		.replace(/^(\d{0,11}).*$/, "$1")
		.replace(/(\d{1})(\d{11})$/, "$1.$2")
		.replace(/(\d{1})(\d{8})$/, "$1.$2")
		.replace(/(\d{1})(\d{5})$/, "$1.$2")
		.replace(/(\d{1})(\d{1,2})$/, "$1,$2");

	return maskedValue;
};

export const trimSafe = (v?: string | null) => {
	if (v == null) return "—";
	const t = v.trim();
	return t.length ? t : "—";
}

export const isValidDate = (d: Date) => !isNaN(d.getTime());

/**
 * @description Idade compacta tipo "1s", "6h", "1d", "10d" — para listas densas (sidebar).
 * @param iso Data ISO de referência.
 */
export const formatCompactAge = (iso: string): string => {
	const diffMs = Date.now() - new Date(iso).getTime();
	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;

	if (diffMs < minute) return `${Math.max(1, Math.floor(diffMs / 1000))}s`;
	if (diffMs < hour) return `${Math.floor(diffMs / minute)}min`;
	if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
	return `${Math.floor(diffMs / day)}d`;
};

// export function summarizeAddress(nf: InvoiceApiMin) {
//   const rua = trimSafe(nf.rua);
//   const bairro = trimSafe(nf.bairro);
//   const cidade = trimSafe(nf.cidade);
//   const cep = trimSafe(nf.cep);
//   const uf = trimSafe(nf.estado);
//   const parts = [rua, bairro, `${cidade}${uf !== "—" ? `/${uf}` : ""}`, cep !== "—" ? `CEP: ${cep}` : ""].filter(
//     Boolean,
//   );
//   return parts.join(" · ");
// }
