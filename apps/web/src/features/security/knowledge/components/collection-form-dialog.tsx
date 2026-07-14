import { AppSheet, Button, Input, Textarea, notify } from "@/components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Library } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateCollection, useUpdateCollection } from "@/features/security/knowledge/api";
import type { KnowledgeCollection } from "@/features/security/knowledge/api";

const schema = z.object({
	name: z.string().min(1, "Nome é obrigatório").max(255, "Máximo de 255 caracteres"),
	description: z.string().max(1000, "Máximo de 1000 caracteres").optional(),
});

type CollectionFormValues = z.infer<typeof schema>;

const emptyValues: CollectionFormValues = { name: "", description: "" };

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Quando presente, o formulário edita a base; senão, cria uma nova. */
	collection?: KnowledgeCollection;
};

export const CollectionFormDialog = ({ open, onOpenChange, collection }: Props) => {
	const createCollection = useCreateCollection();
	const updateCollection = useUpdateCollection();
	const isEdit = Boolean(collection);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<CollectionFormValues>({
		mode: "onTouched",
		resolver: zodResolver(schema),
		defaultValues: emptyValues,
	});

	useEffect(() => {
		if (!open) return;
		reset(collection ? { name: collection.name, description: collection.description ?? "" } : emptyValues);
	}, [open, collection, reset]);

	const onSubmit = async (values: CollectionFormValues) => {
		const payload = { name: values.name, description: values.description?.trim() || undefined };
		if (collection) {
			await updateCollection.mutateAsync({ id: collection.id, payload });
			notify.success("Base atualizada");
		} else {
			await createCollection.mutateAsync(payload);
			notify.success("Base criada");
		}
		onOpenChange(false);
	};

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title={isEdit ? "Editar base de conhecimento" : "Nova base de conhecimento"}
			description="Uma base global de documentos que os agents podem consultar durante uma execução."
			contentClassName="sm:max-w-lg"
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<Library className="size-5" />
				</div>
			}
			footer={
				<>
					<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button type="submit" form="collection-form" size="sm">
						{isEdit ? "Salvar" : "Criar base"}
					</Button>
				</>
			}
		>
			<form id="collection-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
				<Input
					label="Nome"
					placeholder="Ex.: Documentação do produto"
					error={errors.name?.message}
					{...register("name")}
				/>
				<Textarea
					label="Descrição (opcional)"
					placeholder="Para que serve esta base."
					rows={3}
					error={errors.description?.message}
					{...register("description")}
				/>
			</form>
		</AppSheet>
	);
};
