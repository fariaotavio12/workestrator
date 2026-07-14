/**
 * @description Aplica a máscara de CNPJ ao valor fornecido.
 * @param value Valor a ser formatado.
 * @returns CNPJ formatado no padrão 00.000.000/0000-00.
 */
export const maskCnpj = (value: string): string => {
	if (!value) return "";
	return value
		.replace(/\D/g, "")
		.replace(/(\d{2})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d)/, "$1/$2")
		.replace(/(\d{4})(\d)/, "$1-$2")
		.replace(/(-\d{2})\d+?$/, "$1");
};

/**
 * @description Aplica a máscara de CPF ao valor fornecido.
 * @param value Valor a ser formatado.
 * @returns CPF formatado no padrão 000.000.000-00.
 */
export const maskCpf = (value: string): string => {
	if (!value) return "";
	return value
		.replace(/\D/g, "")
		.replace(/(\d{3})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d)/, "$1-$2")
		.replace(/(-\d{2})\d+?$/, "$1");
};

/**
 * @description Aplica máscara de telefone brasileiro com DDI 55 fixo.
 * @param value Número de telefone (com ou sem o 55 inicial).
 * @returns Número formatado no padrão 55 (DD) XXXXX-XXXX.
 */
export const maskBrazilPhone = (value: string): string => {
	if (!value) return "";

	let digits = value.replace(/\D/g, "");

	if (!digits.startsWith("55")) {
		digits = "55" + digits;
	}
	digits = digits.substring(0, 13);

	if (digits.length <= 2) return digits;
	if (digits.length <= 4) return `${digits.slice(0, 2)} (${digits.slice(2)}`;
	if (digits.length <= 9) return `${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
	return `${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
};

/**
 * @description Aplica máscara para telefones fixos e celulares no padrão brasileiro.
 * @param value Número de telefone.
 * @returns Número formatado no padrão (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
 */
export const maskPhone = (value: string): string => {
	if (!value) return "";

	return value
		.replace(/\D/g, "")
		.substring(0, 11)
		.replace(/(\d{2})(\d)/, "($1) $2")
		.replace(/(\d{4,5})(\d{4})$/, "$1-$2")
		.replace(/(-\d{4})\d+?$/, "$1");
};

/**
 * @description Aplica máscara para telefones fixos no padrão brasileiro.
 * @param value Número de telefone fixo.
 * @returns Número formatado no padrão (XX) XXXX-XXXX ou "Número inválido" para entradas inválidas.
 */
export const maskLandline = (value: string): string => {
	if (!value) return "";

	const cleanedValue = value.replace(/\D/g, "");

	if (cleanedValue.length === 10) {
		return cleanedValue.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
	}

	return "Número inválido";
};

/**
 * @description Aplica a máscara de CEP ao valor fornecido.
 * @param value Valor a ser formatado.
 * @returns CEP formatado no padrão 00000-000.
 */
export const maskCep = (value: string): string => {
	if (!value) return "";
	return value
		.replace(/\D/g, "")
		.replace(/(\d{5})(\d)/, "$1-$2")
		.replace(/(-\d{3})\d+?$/, "$1");
};

/**
 * @description Aplica a máscara de dinheiro no padrão brasileiro.
 * @param value Valor a ser formatado.
 * @returns Valor formatado no padrão R$ 0,00.
 */
export const maskBRLMoney = (value: string): string => {
	if (!value) return "";
	return value
		.replace(/\D/g, "")
		.replace(/^(\d{0,14}).*$/, "$1")
		.replace(/(\d{1})(\d{14})$/, "$1.$2")
		.replace(/(\d{1})(\d{11})$/, "$1.$2")
		.replace(/(\d{1})(\d{8})$/, "$1.$2")
		.replace(/(\d{1})(\d{5})$/, "$1.$2")
		.replace(/(\d{1})(\d{1,2})$/, "$1,$2");
};

/**
 * @description Remove a máscara de dinheiro do valor fornecido.
 * @param value Valor a ser desformatado.
 * @returns Valor sem máscara.
 */
export const removeBRLMoneyMask = (value: string): string => {
	if (!value) return "";
	return value
		.trim()
		.replace(/[^\d.,-]/g, "")
		.replace(/\./g, "")
		.replace(/,/g, ".");
};

/**
 * @description Permite apenas números inteiros.
 * @param value Valor a ser formatado.
 * @returns Valor formatado com apenas números inteiros.
 */
export const maskOnlyIntegers = (value: string): string => {
	if (!value) return "";
	return value.replace(/\D/g, "");
};

/**
 * @description Permite apenas números decimais.
 * @param value Valor a ser formatado.
 * @returns Valor formatado com apenas números decimais.
 */
export const maskOnlyDecimals = (value: string): string => {
	if (!value) return "";
	return value.replace(/[^0-9,.]/g, "");
};

/**
 * @description Permite apenas letras.
 * @param value Valor a ser formatado.
 * @returns Valor formatado com apenas letras.
 */
export const maskOnlyLetters = (value: string): string => {
	if (!value) return "";
	return value.replace(/[^a-zA-ZÀ-ÿ ]/g, "");
};

/**
 * @description Aplica a máscara de código de loja ao valor fornecido.
 * @param value Valor a ser formatado.
 * @returns Código de loja formatado no padrão 000000-00.
 */
export const maskStoreCode = (value: string): string => {
	if (!value) return "";
	return value
		.replace(/\D/g, "")
		.replace(/(\d{6})(\d)/, "$1-$2")
		.replace(/(-\d{2})\d+?$/, "$1");
};

/**
 * @description Não permite espaços em branco.
 * @param value Valor a ser formatado.
 * @returns Valor sem espaços em branco.
 */
export const maskNoSpaces = (value: string): string => {
	if (!value) return "";
	return value.replace(/\s/g, "");
};
