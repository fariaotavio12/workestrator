import { cn } from "@/app/utils/cn";
import { FieldWrapper } from "@/components/field-wrapper";
import { UploadCloudIcon } from "lucide-react";
import * as React from "react";

type FileInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
	label?: string;

	/** retorna os arquivos validados */
	onAddFiles?: (files: File[]) => void;

	acceptedFileTypes?: string[];
	placeholder?: string;
	helperText?: string;

	/** controla se pode selecionar vários via picker */
	multiple?: boolean;

	/** limite máximo por seleção/drop */
	maxFiles?: 1 | 2 | 3 | 4 | number;

	isShadow?: boolean;
	description?: string;
	error?: string;
};

const isAccepted = (file: File, acceptedFileTypes?: string[]) => {
	if (!acceptedFileTypes?.length) return true;

	return acceptedFileTypes.some((t) => {
		const token = t.trim().toLowerCase();
		const fileType = (file.type || "").toLowerCase();
		const fileName = (file.name || "").toLowerCase();

		if (!token) return false;
		if (token.startsWith(".")) return fileName.endsWith(token);
		if (token.endsWith("/*")) {
			const base = token.replace("/*", "");
			return fileType.startsWith(base + "/");
		}
		return fileType === token;
	});
}

function clampFiles(files: File[], maxFiles: number) {
	return files.slice(0, Math.max(1, maxFiles));
}

export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
	(
		{
			label,
			onAddFiles,
			acceptedFileTypes,
			placeholder = "Adicionar anexo",
			helperText,
			className,
			id,
			description,
			error,
			disabled,
			isShadow,

			multiple = false,
			maxFiles = 1,

			...props
		},
		ref,
	) => {
		const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);
		const generatedId = React.useId();
		const inputId = id ?? generatedId;

		const [isDragOver, setIsDragOver] = React.useState(false);
		const [localError, setLocalError] = React.useState<string>("");

		const openPicker = () => {
			if (disabled) return;
			setLocalError("");
			hiddenInputRef.current?.click();
		};

		const validateAndEmit = (incoming: File[]) => {
			if (!onAddFiles) return;

			// 1) remove vazios
			const safe = incoming.filter(Boolean);

			// 2) valida tipos
			const accepted = safe.filter((f) => isAccepted(f, acceptedFileTypes));
			if (accepted.length !== safe.length) {
				setLocalError("Um ou mais arquivos não são suportados.");
				// continua com os aceitos (ou você pode bloquear tudo se preferir)
			}

			// 3) valida quantidade
			const effectiveMax = multiple ? maxFiles : 1;
			if (accepted.length > effectiveMax) {
				setLocalError(`Selecione no máximo ${effectiveMax} arquivo(s).`);
			}

			const finalFiles = clampFiles(accepted, effectiveMax);

			if (!finalFiles.length) return;
			setLocalError("");
			onAddFiles(finalFiles);
		};

		const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files ?? []);
			validateAndEmit(files);
			event.target.value = "";
		};

		const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
			if (disabled || !onAddFiles) return;
			e.preventDefault();
			e.stopPropagation();

			setIsDragOver(false);

			const files = Array.from(e.dataTransfer.files ?? []);
			validateAndEmit(files);
		};

		const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
			if (disabled) return;
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				openPicker();
			}
		};

		const secondary = helperText ?? (multiple ? `Selecione até ${maxFiles} arquivo(s).` : "Selecione 1 arquivo.");

		const effectiveError = error || localError;

		return (
			<FieldWrapper
				label={label}
				htmlFor={inputId}
				description={description}
				error={effectiveError}
				className={className}
			>
				<input
					ref={(node) => {
						hiddenInputRef.current = node;
						if (typeof ref === "function") ref(node);
						else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
					}}
					id={inputId}
					type="file"
					className="sr-only"
					accept={acceptedFileTypes?.join(",")}
					multiple={multiple}
					onChange={handleFileChange}
					disabled={disabled}
					aria-invalid={effectiveError ? true : undefined}
					{...props}
				/>

				<div
					role="button"
					tabIndex={disabled ? -1 : 0}
					onClick={openPicker}
					onKeyDown={handleKeyDown}
					onDragEnter={(e) => {
						if (disabled) return;
						e.preventDefault();
						setLocalError("");
						setIsDragOver(true);
					}}
					onDragOver={(e) => {
						if (disabled) return;
						e.preventDefault();
						setIsDragOver(true);
					}}
					onDragLeave={(e) => {
						if (disabled) return;
						e.preventDefault();
						setIsDragOver(false);
					}}
					onDrop={handleDrop}
					aria-disabled={disabled ? true : undefined}
					title={disabled ? undefined : "Clique para anexar"}
					className={cn(
						"group w-full rounded-lg border px-4 py-4 transition",
						"border-dashed",
						"bg-accent/10 hover:bg-accent/15",
						"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
						isShadow && "shadow-sm",
						isDragOver && "border-primary bg-accent/25 scale-[1.01]",
						effectiveError && "border-destructive/60",
						disabled && "hover:bg-accent/10 cursor-not-allowed opacity-60",
					)}
				>
					<div className="flex items-start gap-3">
						<div
							className={cn(
								"mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
								"bg-accent/20",
								isDragOver && "bg-accent/30",
							)}
						>
							<UploadCloudIcon size={18} />
						</div>

						<div className="min-w-0">
							<div className="text-sm leading-5 font-medium">{placeholder}</div>
							{secondary ? <div className="text-muted-foreground mt-0.5 text-xs">{secondary}</div> : null}
						</div>

						<div className="text-muted-foreground ml-auto text-xs">{multiple ? `Até ${maxFiles}` : "1"}</div>
					</div>
				</div>
			</FieldWrapper>
		);
	},
);

FileInput.displayName = "FileInput";
