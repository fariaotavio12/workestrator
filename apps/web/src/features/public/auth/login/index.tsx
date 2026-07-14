import { IconGoogle } from "@/app/assets/icons";
import { apiUrl } from "@/app/api/clients";
import { appBrand } from "@/app/config/branding";
import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { CustomLink } from "@/components/link";
import { Separator } from "@/components/separator";
import { Typography } from "@/components/typography";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeClosed, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().trim().min(1, "Por favor, insira seu email"),
	password: z.string().min(1, "Por favor, insira sua senha").min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginSchema = z.infer<typeof loginSchema>;

export const PageLogin = () => {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginSchema>({
		resolver: zodResolver(loginSchema),
	});

	const { login, isLoading } = useAuth();
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const returnTo = (location.state as { from?: string } | null)?.from;

	const onLoginGoogle = async () => {
		const baseUrl = `${apiUrl}/auth/google/login?registrationId=google`;
		window.location.href = baseUrl;
	};

	const onSubmit: SubmitHandler<LoginSchema> = async (userCredentials) => {
		try {
			await login(userCredentials);
			navigate(returnTo || Rotas.protegidas.dashboards.home, { replace: true });
		} catch {
			// erro ja notificado via toast pelo hook de login
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex h-auto w-full max-w-lg flex-col gap-6 p-6">
			<div className="flex w-full flex-col gap-3">
				<Typography variant="display-sm">Entrar no {appBrand.shortName}</Typography>
				<Typography variant="body-sm" className="text-muted-foreground">
					Entre com o e-mail e a senha da sua conta.
				</Typography>
			</div>
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
			<div className="flex w-full justify-between gap-3">
				<div className="flex flex-row items-center gap-2">
					<Checkbox id="checkboxEsqueceu" />
					<Label htmlFor="checkboxEsqueceu">Lembrar por 30 dias</Label>
				</div>
				<Link to={Rotas.desprotegidas.auth.passwordRecovery} className="text-center text-sm">
					Esqueceu a senha
				</Link>
			</div>
			<Button type="submit" disabled={isLoading}>
				{isLoading && <LoaderCircle className="animate-spin" />}
				Entrar
			</Button>
			<div className="flex w-full flex-row items-center gap-3">
				<Separator />
				<Typography variant="caption" className="text-muted-foreground" as="span">
					ou
				</Typography>
				<Separator />
			</div>
			<Button className="w-full" type="button" variant="outline" onClick={() => onLoginGoogle()}>
				<IconGoogle size="md_sm" />
				Entrar com o Google
			</Button>
			<CustomLink
				to={Rotas.desprotegidas.auth.register}
				variant="link"
				size="link"
				className="text-muted-foreground font-medium"
			>
				Não possui uma conta?
				<Typography variant="caption" as="span" className="text-text font-semibold">
					Registrar gratuitamente
				</Typography>
			</CustomLink>
		</form>
	);
};
