import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Lightbulb, Mail, MessageSquare, Route, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { appBrand } from "@/app/config/branding";
import { Rotas } from "@/app/routing/variables";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CustomLink, Input, Textarea, Typography, notify } from "@/components";

type ImprovementFormValues = {
	name: string;
	email: string;
	improvementType: string;
	impact: string;
	subject: string;
	context: string;
	message: string;
};

const participationEmail = import.meta.env.VITE_PARTICIPATION_EMAIL ?? "fariaotavio30@gmail.com";
const participationFormUrl = import.meta.env.VITE_PARTICIPATION_FORM_URL;

const improvementTypes = [
	"Melhoria de interface",
	"Bug ou comportamento estranho",
	"Nova integração",
	"Fluxo de execução",
	"Documentação",
	"Outro ponto",
];

const signals = [
	{
		icon: MessageSquare,
		title: "Conte o que tentou fazer",
		description: "O melhor feedback vem com contexto: tela, fluxo, squad ou ação que gerou a ideia.",
	},
	{
		icon: Route,
		title: "Explique o impacto",
		description: "Ajuda a separar ajuste pequeno, bloqueio real e melhoria que muda o produto.",
	},
	{
		icon: ShieldCheck,
		title: "Nada entra sem revisão",
		description: "As sugestões viram backlog, discussão ou pull request aprovado antes de release.",
	},
];

export const PageDevelopmentInterest = () => {
	const schema = useMemo(
		() =>
			z.object({
				name: z.string().trim().min(2, "Informe seu nome."),
				email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
				improvementType: z.string().trim().min(3, "Informe o tipo de melhoria."),
				impact: z.string().trim().min(3, "Informe o impacto esperado."),
				subject: z.string().trim().min(4, "Dê um título curto para a melhoria."),
				context: z.string().trim(),
				message: z.string().trim().min(15, "Descreva a melhoria com um pouco mais de detalhe."),
			}),
		[],
	);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<ImprovementFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			email: "",
			improvementType: "",
			impact: "",
			subject: "",
			context: "",
			message: "",
		},
	});

	const onSubmit = async (values: ImprovementFormValues) => {
		if (participationFormUrl) {
			const response = await fetch(participationFormUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source: "workestrator-improvements", ...values }),
			});

			if (!response.ok) {
				notify.error("Não foi possível enviar", "Confira a configuração do formulário e tente novamente.");
				return;
			}

			notify.success("Melhoria enviada", "Obrigado por ajudar a melhorar o Workestrator.");
			reset();
			return;
		}

		const subject = encodeURIComponent(`[${appBrand.name}] Melhoria: ${values.subject}`);
		const body = encodeURIComponent(
			[
				"Nova sugestão recebida pelo site.",
				"",
				`Nome: ${values.name}`,
				`Email: ${values.email}`,
				`Tipo: ${values.improvementType}`,
				`Impacto: ${values.impact}`,
				`Título: ${values.subject}`,
				`Contexto: ${values.context || "Não informado"}`,
				"",
				"Descrição:",
				values.message,
			].join("\n"),
		);

		window.location.assign(`mailto:${participationEmail}?subject=${subject}&body=${body}`);
		notify.info("Abrindo seu e-mail", `Envie a mensagem para ${participationEmail} para registrar a melhoria.`);
	};

	return (
		<div className="flex w-full flex-col">
			<section className="w-full border-b">
				<div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-14 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-20 lg:py-20">
					<div className="flex max-w-3xl flex-col justify-between gap-10">
						<div className="flex flex-col gap-6">
							<Badge variant="outline" className="w-fit">
								Central de melhorias
							</Badge>
							<div className="flex flex-col gap-4">
								<Typography variant="display-lg">Envie uma melhoria para o {appBrand.name}</Typography>
								<Typography variant="body-md" className="text-muted-foreground max-w-2xl">
									Encontrou algo confuso, travado ou sentiu falta de uma integração? Mande a sugestão com contexto
									para a gente avaliar e transformar em backlog.
								</Typography>
							</div>
							<div className="flex flex-wrap gap-3">
								<CustomLink to={Rotas.desprotegidas.landingPages.download} variant="outline">
									Baixar desktop
									<ArrowRight className="size-4" />
								</CustomLink>
							</div>
						</div>

						<div className="grid gap-4 border-t pt-6">
							{signals.map(({ icon: Icon, title, description }) => (
								<div key={title} className="grid gap-3 sm:grid-cols-[2rem_1fr]">
									<div className="bg-muted text-primary flex size-8 items-center justify-center rounded-lg border">
										<Icon className="size-4" />
									</div>
									<div className="flex flex-col gap-1">
										<Typography variant="title-sm">{title}</Typography>
										<Typography variant="body-sm" className="text-muted-foreground max-w-xl">
											{description}
										</Typography>
									</div>
								</div>
							))}
						</div>
					</div>

					<Card className="self-start">
						<CardHeader>
							<div className="flex items-start justify-between gap-4">
								<div className="flex flex-col gap-2">
									<CardTitle>
										<Typography variant="title-md">Descreva a melhoria</Typography>
									</CardTitle>
									<Typography variant="body-sm" className="text-muted-foreground">
										O envio abre seu e-mail com tudo preenchido para chegar direto para o time.
									</Typography>
								</div>
								<div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
									<Lightbulb className="size-5" />
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
								<div className="grid gap-4 md:grid-cols-2">
									<Input
										id="name"
										label="Nome"
										placeholder="Seu nome"
										error={errors.name?.message}
										{...register("name")}
									/>
									<Input
										id="email"
										type="email"
										label="E-mail"
										placeholder="voce@email.com"
										error={errors.email?.message}
										{...register("email")}
									/>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<Input
										id="improvementType"
										label="Tipo de melhoria"
										list="improvement-types"
										placeholder="Ex.: Melhoria de interface"
										error={errors.improvementType?.message}
										{...register("improvementType")}
									/>
									<datalist id="improvement-types">
										{improvementTypes.map((type) => (
											<option key={type} value={type} />
										))}
									</datalist>

									<Input
										id="impact"
										label="Impacto"
										placeholder="Ex.: bloqueia uso, melhora clareza..."
										error={errors.impact?.message}
										iconLeft={<CheckCircle2 className="size-4" />}
										{...register("impact")}
									/>
								</div>

								<Input
									id="subject"
									label="Título da melhoria"
									placeholder="Ex.: deixar o histórico de execuções mais fácil de filtrar"
									error={errors.subject?.message}
									{...register("subject")}
								/>

								<Input
									id="context"
									label="Onde aconteceu?"
									placeholder="Ex.: /dashboard, detalhe do squad, instalador, login..."
									error={errors.context?.message}
									{...register("context")}
								/>

								<Textarea
									id="message"
									label="Detalhes"
									placeholder="Descreva o que você esperava, o que aconteceu e como isso poderia ficar melhor."
									rows={6}
									error={errors.message?.message}
									{...register("message")}
								/>

								<Button type="submit" disabled={isSubmitting} className="w-full">
									<Mail className="size-4" />
									{isSubmitting ? "Preparando envio..." : "Enviar melhoria"}
								</Button>
							</form>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
};
