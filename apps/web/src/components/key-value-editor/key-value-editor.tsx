import { Button } from "@/components/button";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";
import { Input } from "@/components/input";
import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

export type KeyValueEditorProps = Omit<FieldWrapperProps, "className" | "children"> & {
	value?: Record<string, string>;
	onChange: (value: Record<string, string>) => void;
	keyPlaceholder?: string;
	valuePlaceholder?: string;
	addLabel?: string;
	className?: string;
};

type Row = { id: string; key: string; value: string };

const rowId = (): string => Math.random().toString(36).slice(2, 10);

const toRows = (value: Record<string, string> | undefined): Row[] =>
	Object.entries(value ?? {}).map(([key, val]) => ({ id: rowId(), key, value: val }));

const toRecord = (rows: Row[]): Record<string, string> =>
	Object.fromEntries(rows.filter((row) => row.key.trim().length > 0).map((row) => [row.key.trim(), row.value]));

/**
 * Editor de linhas chave→valor — substitui textarea de JSON cru pra headers/env/config. Estado
 * interno (linhas com id estável) inicializado a partir de `value`; cada edição emite o Record
 * pronto via `onChange`, filtrando linhas com chave vazia (rascunho de uma linha nova).
 */
export const KeyValueEditor = ({
	label,
	description,
	error,
	value,
	onChange,
	keyPlaceholder = "Chave",
	valuePlaceholder = "Valor",
	addLabel = "Adicionar",
	className,
}: KeyValueEditorProps): ReactNode => {
	const [rows, setRows] = useState<Row[]>(() => toRows(value));

	const emit = (next: Row[]) => {
		setRows(next);
		onChange(toRecord(next));
	};

	const updateRow = (id: string, patch: Partial<Pick<Row, "key" | "value">>) =>
		emit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

	const removeRow = (id: string) => emit(rows.filter((row) => row.id !== id));

	const addRow = () => emit([...rows, { id: rowId(), key: "", value: "" }]);

	return (
		<FieldWrapper className={className} label={label} description={description} error={error}>
			<div className="flex flex-col gap-2">
				{rows.map((row) => (
					<div key={row.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
						<Input
							placeholder={keyPlaceholder}
							value={row.key}
							onChange={(e) => updateRow(row.id, { key: e.target.value })}
							className="font-mono text-xs"
						/>
						<Input
							placeholder={valuePlaceholder}
							value={row.value}
							onChange={(e) => updateRow(row.id, { value: e.target.value })}
							className="font-mono text-xs"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
							aria-label="Remover linha"
							onClick={() => removeRow(row.id)}
						>
							<Trash2 />
						</Button>
					</div>
				))}
				<Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
					<Plus />
					{addLabel}
				</Button>
			</div>
		</FieldWrapper>
	);
};
