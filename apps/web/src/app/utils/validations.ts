export const validatePhoneNumber = (phoneNumber: string): boolean => {
	const regex = /^(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)(?:((?:9\d|[2-9])\d{3})-?(\d{4}))$/;
	if (regex.test(phoneNumber)) {
		return true;
	} else {
		return false;
	}
}

export const validateCpf = (cpf: string): boolean => {
	const cleanedCpf = cpf.replace(/[^\d]+/g, "");

	if (cleanedCpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

	const cpfDigits = cleanedCpf.split("").map((el) => +el);

	const rest = (count: number): number => {
		return (
			((cpfDigits.slice(0, count - 12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11) % 10
		);
	};

	return rest(10) === cpfDigits[9] && rest(11) === cpfDigits[10];
}
