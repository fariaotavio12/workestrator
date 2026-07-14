import { appBrand } from "@/app/config/branding";
import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { apiUrl } from "@/app/api/clients";
import { IconGoogle } from "@/app/assets/icons";
import { Button } from "@/components/button";
import { CustomLink } from "@/components/link";
import { Input } from "@/components/input";
import { Separator } from "@/components/separator";
import { Typography } from "@/components/typography";
import { registerSchema, type RegisterFormValues } from "@/features/public/auth/register/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeClosed, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

export const PageRegister = () => {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormValues>({
		resolver: zodResolver(registerSchema),
	});

	const { register: registerUser, isLoading } = useAuth();
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const navigate = useNavigate();

	const onRegisterGoogle = () => {
		window.location.href = `${apiUrl}/auth/google/login?registrationId=google`;
	};

	const onSubmit: SubmitHandler<RegisterFormValues> = async (values) => {
		try {
			await registerUser({ name: values.name, email: values.email, password: values.password });
			navigate(Rotas.protegidas.dashboards.home, { replace: true });
		} catch {
			// erro ja notificado via toast pelo hook de registro
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex h-auto w-full max-w-lg flex-col gap-6 p-6">
			<div className="flex w-full flex-col gap-3">
				<Typography variant="display-sm">Criar conta no {appBrand.shortName}</Typography>
				<Typography variant="body-sm" className="text-muted-foreground">
					Leva menos de um minuto.
				</Typography>
			</div>

			<Input label="Nome" placeholder="Seu nome" id="name" error={errors?.name?.message} {...register("name")} />

			<Input
				label="Email"
				placeholder="Insira seu email"
				id="email"
				type="email"
				error={errors?.email?.message}
				{...register("email")}
			/>

			<Input
				label="Senha"
				placeholder="Insira sua senha"
				id="password"
				error={errors?.password?.message}
				type={isPasswordVisible ? "text" : "password"}
				iconRight={
					<button
						type="button"
						className="cursor-pointer"
						aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
						onClick={() => setIsPasswordVisible(!isPasswordVisible)}
					>
						{isPasswordVisible ? <Eye size={16} /> : <EyeClosed size={16} />}
					</button>
				}
				{...register("password")}
			/>

			<Input
				label="Confirmar senha"
				placeholder="Repita sua senha"
				id="confirmPassword"
				error={errors?.confirmPassword?.message}
				type={isPasswordVisible ? "text" : "password"}
				{...register("confirmPassword")}
			/>

			<Button type="submit" disabled={isLoading}>
				{isLoading && <LoaderCircle className="animate-spin" />}
				Criar conta
			</Button>

			<div className="flex w-full flex-row items-center gap-3">
				<Separator />
				<Typography variant="caption" className="text-muted-foreground" as="span">
					ou
				</Typography>
				<Separator />
			</div>

			<Button className="w-full" type="button" variant="outline" onClick={onRegisterGoogle}>
				<IconGoogle size="md_sm" />
				Continuar com o Google
			</Button>

			<CustomLink
				to={Rotas.desprotegidas.auth.login}
				variant="link"
				size="link"
				className="text-muted-foreground font-medium"
			>
				Já possui uma conta?
				<Typography variant="caption" as="span" className="text-text font-semibold">
					Fazer login
				</Typography>
			</CustomLink>
		</form>
	);
};
