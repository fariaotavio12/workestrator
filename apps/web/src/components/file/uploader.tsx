import { useDeleteFile, useUploadFile } from "@/app/api/storage";
import { FileUI } from "@/components/file";
import { notify } from "@/components/toast/notify";
import { useRef, useState } from "react";

type FileUploaderProps = {
	/** ID de referência do recurso no object store (obrigatório para habilitar upload) */
	referenceId?: string;
	/** ID da empresa (obrigatório para habilitar upload) */
	companyId?: string;
	module?: string;
	objectType?: "IMAGE" | "FILE";

	/** URLs já persistidas — campo controlado pelo pai */
	value?: string[];
	onChange?: (urls: string[]) => void;

	/** Mensagem exibida quando referenceId não está disponível */
	notReadyMessage?: string;

	// — FileInput passthrough —
	label?: string;
	placeholder?: string;
	description?: string;
	helperText?: string;
	acceptedFileTypes?: string[];
	multiple?: boolean;
	maxFiles?: number;
	className?: string;
	disabled?: boolean;
	error?: string;
	isShadow?: boolean;

	// — ações visíveis no DocumentComponent —
	onViewPreview?: boolean;
	onViewDownload?: boolean;
	onViewCopyLink?: boolean;
	onViewRemove?: boolean;
};

export const FileUploader = ({
	referenceId,
	companyId,
	module,
	value = [],
	onChange,
	notReadyMessage = "Salve o registro antes de adicionar anexos.",
	label,
	placeholder,
	description,
	helperText,
	acceptedFileTypes,
	multiple = true,
	maxFiles = 5,
	className,
	disabled = false,
	error,
	isShadow,
	onViewPreview = true,
	onViewDownload,
	onViewCopyLink = true,
	onViewRemove = true,
}: FileUploaderProps) => {
	const [uploading, setUploading] = useState(false);
	const { mutateAsync: uploadFile } = useUploadFile();
	const { mutateAsync: deleteFile } = useDeleteFile();

	/** Mapeia publicUrl → path de storage para arquivos enviados nesta sessão */
	const pathMapRef = useRef<Map<string, string>>(new Map());

	const canUpload = true;
	// !!referenceId;

	const handleAddFiles = async (incoming: File[]) => {
		if (!canUpload) {
			notify.error(notReadyMessage);
			return;
		}

		if (value.length + incoming.length > maxFiles) {
			notify.error("Limite de " + maxFiles + " arquivos atingido.");
			return;
		}

		setUploading(true);
		try {
			const results = await Promise.all(
				incoming.map((file) =>
					uploadFile({
						file,
						companyId: companyId!,
						referenceId: referenceId!,
						module,
					}),
				),
			);
			results.forEach((r) => pathMapRef.current.set(r.publicUrl, r.path));
			onChange?.([...value, ...results.map((r) => r.publicUrl)]);
		} finally {
			setUploading(false);
		}
	};

	const handleRemove = async (id: string | number) => {
		const index = id as number;
		const url = value[index];
		if (!url) return;

		const path = pathMapRef.current.get(url);
		if (path) {
			await deleteFile(path);
			pathMapRef.current.delete(url);
		}

		onChange?.(value.filter((_, i) => i !== index));
	};

	const effectiveHelperText = !canUpload ? notReadyMessage : helperText;

	return (
		<div className={className}>
			<FileUI.Input
				label={label}
				placeholder={placeholder}
				description={description}
				helperText={effectiveHelperText}
				acceptedFileTypes={acceptedFileTypes}
				multiple={multiple}
				maxFiles={maxFiles}
				disabled={disabled || uploading || !canUpload}
				error={error}
				isShadow={isShadow}
				onAddFiles={(files) => void handleAddFiles(files)}
			/>

			{value.length > 0 && (
				<div className="mt-3 flex flex-col gap-2">
					{value.map((url, index) => (
						<FileUI.Document
							key={index}
							id={index}
							url={url}
							onViewPreview={onViewPreview}
							onViewDownload={onViewDownload}
							onViewCopyLink={onViewCopyLink}
							onViewRemove={onViewRemove}
							onRemove={(id) => void handleRemove(id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
