import { Rotas } from "@/app/routing/variables";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

export type FormType = "criar" | "editar" | "visualizar" | "clonar" | "invalido";
export const validFormTypes: FormType[] = ["criar", "editar", "visualizar", "clonar"];

type UseFormParamsResult = {
	formType?: string;
	id?: string;
	idPlano?: string;
	isValidFormType: boolean;
	isViewMode: boolean;
	isEditMode: boolean;
	isCreateMode: boolean;
	shouldRedirect: boolean;
	mode: FormType;
};

export const useFormParams = (): UseFormParamsResult => {
	const { formType, id, idPlano } = useParams<{
		formType: string;
		id?: string;
		idPlano?: string;
	}>();

	const navigate = useNavigate();

	const result = useMemo((): UseFormParamsResult => {
		// por que não só ter um 'mode' com valores 'view' ou 'edit' ou 'create'?
		const isValid = !!(formType && validFormTypes.includes(formType as any));
		const isView = formType === "visualizar";
		const isEdit = formType === "editar";
		const isCreate = formType === "criar";

		const mode: FormType =
			formType === "visualizar"
				? "visualizar"
				: formType === "editar"
					? "editar"
					: formType === "criar"
						? "criar"
						: formType === "clonar"
							? "clonar"
							: "invalido";

		return {
			formType,
			id,
			idPlano,
			isValidFormType: isValid,
			isViewMode: isView,
			isEditMode: isEdit,
			isCreateMode: isCreate,
			shouldRedirect: !isValid && formType !== undefined,
			mode,
		};
	}, [formType, id, idPlano]);

	// Redirecionamento automático
	const { shouldRedirect } = result;

	if (shouldRedirect) {
		navigate(Rotas.desprotegidas.NOT_FOUND);
	}

	return result;
};
