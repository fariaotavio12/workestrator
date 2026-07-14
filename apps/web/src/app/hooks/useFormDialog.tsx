import { useCallback, useState } from "react";

export type FormDialogMode = "new" | "edit";

export type DialogFormProps = {
	onOpenChange: (open: boolean) => void;
	dialog: FormDialogState<string>;
	onClose: () => void;
};

export type FormDialogState<TId extends string | number = string> = {
	open: boolean;
	mode: FormDialogMode;
	id: TId | undefined;
};

export const useFormDialog = <TId extends string | number = string>() => {
	const [state, setState] = useState<FormDialogState<TId>>({
		open: false,
		mode: "new",
		id: undefined,
	});

	const openNew = useCallback(() => setState({ open: true, mode: "new", id: undefined }), []);
	const openEdit = useCallback((id: TId) => setState({ open: true, mode: "edit", id: id as TId }), []);
	// const openView = useCallback((id: TId) => setState({ open: true, mode: "view", id }), []);

	const close = useCallback(() => setState((prev) => ({ ...prev, open: false })), []);

	const onOpenChange = useCallback((open: boolean) => {
		if (!open) setState((prev) => ({ ...prev, open: false }));
	}, []);

	return { state, openNew, openEdit, close, onOpenChange };
};
