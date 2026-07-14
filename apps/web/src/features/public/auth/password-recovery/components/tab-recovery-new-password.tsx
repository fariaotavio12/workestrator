import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeClosed, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z
	.object({
		password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
		confirmPassword: z.string().min(1, "Confirme a senha"),
	})
	.refine((v) => v.password === v.confirmPassword, {
		message: "As senhas não conferem",
		path: ["confirmPassword"],
	});

type FormData = z.infer<typeof schema>;

type Props = {
	onSubmit: (data: FormData) => Promise<void> | void;
};

export const TabRecoveryNewPassword = ({ onSubmit }: Props) => {
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { password: "", confirmPassword: "" },
		mode: "onSubmit",
	});

	return (
		<>
			<div className="flex w-full flex-col gap-3">
				<p className="text-2xl font-semibold tracking-tight">Definir nova senha</p>
				<p className="text-muted-foreground w-full text-sm">Insira e confirme sua nova senha.</p>
			</div>

			<form
				className="flex w-full flex-col gap-4"
				onSubmit={form.handleSubmit(async (data) => {
					await onSubmit(data);
				})}
			>
				<Input
					wrapperClassName="w-full"
					label="Nova senha"
					placeholder="Insira sua senha"
					id="new-password"
					error={form.formState.errors.password?.message}
					type={isPasswordVisible ? "text" : "password"}
					iconRight={
						<div className="cursor-pointer" onClick={() => setIsPasswordVisible((v) => !v)}>
							{isPasswordVisible ? <Eye size={16} /> : <EyeClosed size={16} />}
						</div>
					}
					{...form.register("password")}
				/>

				<Input
					wrapperClassName="w-full"
					label="Confirmar senha"
					placeholder="Confirme sua senha"
					id="confirm-password"
					error={form.formState.errors.confirmPassword?.message}
					type={isPasswordVisible ? "text" : "password"}
					{...form.register("confirmPassword")}
				/>

				<Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
					{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
					Continuar
				</Button>
			</form>
		</>
	);
};
