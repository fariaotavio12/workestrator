import { useSendEmailVerificationCodeForgotPassword } from "@/features/public/auth/api";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
	email: z.string().email("Informe um e-mail válido"),
});

type FormData = z.infer<typeof schema>;

type Props = {
	defaultEmail?: string;
	onNext: (email: string) => Promise<void> | void;
};

export const TabRecoveryEmail = ({ defaultEmail = "", onNext }: Props) => {
	const { mutateAsync: sendCode } = useSendEmailVerificationCodeForgotPassword();

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { email: defaultEmail },
		mode: "onSubmit",
	});

	return (
		<form
			className="flex w-full flex-col gap-4"
			onSubmit={form.handleSubmit(async (data) => {
				await sendCode(data.email);
				await onNext(data.email);
			})}
		>
			<Input
				wrapperClassName="w-full"
				id="recovery-email"
				label="Email"
				type="email"
				error={form.formState.errors.email?.message}
				{...form.register("email")}
			/>

			<Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
				{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
				Continuar
			</Button>
		</form>
	);
};
