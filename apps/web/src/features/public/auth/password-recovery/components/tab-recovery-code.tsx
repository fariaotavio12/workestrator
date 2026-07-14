import { Button } from "@/components/button";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/input-otp";
import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { Edit2, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
	code: z.string().min(6, "Digite o código completo").max(6, "Digite o código completo"),
});

type FormData = z.infer<typeof schema>;

type Props = {
	email: string;
	defaultCode?: string;
	onBack: () => void;
	onNext: (code: string) => Promise<void> | void;
	isLoading?: boolean;
};

export const TabRecoveryCode = ({ email, defaultCode = "", onBack, onNext, isLoading }: Props) => {
	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { code: defaultCode },
		mode: "onSubmit",
	});

	const maskedEmail = useMemo(() => {
		if (!email) return "seu e-mail";
		const [user, domain] = email.split("@");
		if (!domain) return email;
		const safeUser = user.length <= 2 ? `${user[0] ?? ""}*` : `${user.slice(0, 2)}***`;
		return `${safeUser}@${domain}`;
	}, [email]);

	return (
		<>
			<div className="flex w-full flex-col gap-3">
				<p className="text-2xl font-semibold tracking-tight">Digite o código de verificação</p>
				<p className="text-muted-foreground flex w-full flex-row items-center text-sm">
					Enviamos um código para {maskedEmail}
					<Edit2 size={16} className="ml-3 cursor-pointer" onClick={onBack} />
				</p>
			</div>

			<form
				className="flex w-full flex-col gap-4"
				onSubmit={form.handleSubmit(async (data) => {
					// await api.post("/auth/password/verify-code", { email, code: data.code })
					await onNext(data.code);
				})}
			>
				<div className="flex w-full flex-col gap-2">
					<Controller
						control={form.control}
						name="code"
						render={({ field }) => (
							<InputOTP
								maxLength={6}
								pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
								value={field.value}
								onChange={field.onChange}
							>
								<InputOTPGroup className="w-full">
									<InputOTPSlot index={0} className="h-18 w-18" />
									<InputOTPSlot index={1} className="h-18 w-18" />
									<InputOTPSlot index={2} className="h-18 w-18" />
									<InputOTPSeparator />
									<InputOTPSlot index={3} className="h-18 w-18" />
									<InputOTPSlot index={4} className="h-18 w-18" />
									<InputOTPSlot index={5} className="h-18 w-18" />
								</InputOTPGroup>
							</InputOTP>
						)}
					/>

					{form.formState.errors.code?.message ? (
						<p className="text-destructive text-sm">{form.formState.errors.code.message}</p>
					) : null}
				</div>

				<Button className="w-full" type="submit" disabled={form.formState.isSubmitting || isLoading}>
					{form.formState.isSubmitting || isLoading ? <Loader2 className="animate-spin" /> : null}
					Continuar
				</Button>
			</form>
		</>
	);
};
