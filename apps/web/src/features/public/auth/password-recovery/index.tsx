import { Rotas } from "@/app/routing/variables";
import { CustomLink } from "@/components/link";
import { Separator } from "@/components/separator";
import { Tabs, TabsContent, TabsContents } from "@/components/tabs";
import { useState } from "react";

import { useResetPassword } from "@/features/public/auth/api";
import { TabRecoveryCode } from "@/features/public/auth/password-recovery/components/tab-recovery-code";
import { TabRecoveryEmail } from "@/features/public/auth/password-recovery/components/tab-recovery-email";
import { TabRecoveryNewPassword } from "@/features/public/auth/password-recovery/components/tab-recovery-new-password";
import { useNavigate } from "react-router-dom";

type TabKey = "email" | "codigo" | "tabsenha";

export const PagePasswordRecovery = () => {
	const [valueTab, setValueTab] = useState<TabKey>("email");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const { mutateAsync: resetPassword } = useResetPassword();
	const navigate = useNavigate();

	return (
		<div className="flex h-auto w-full max-w-lg flex-col gap-6 p-6">
			<Tabs value={valueTab}>
				<TabsContents>
					<TabsContent className="flex w-full flex-col gap-4 rounded pt-2" value="email">
						<div className="flex w-full flex-col items-center gap-6">
							<div className="flex w-full flex-col gap-3">
								<p className="text-2xl font-semibold tracking-tight">Recuperar conta</p>
								<p className="text-muted-foreground w-full text-sm">
									Informe seu e-mail para receber o código de verificação.
								</p>
							</div>

							<TabRecoveryEmail
								defaultEmail={email}
								onNext={async (nextEmail: string) => {
									setEmail(nextEmail);
									setValueTab("tabsenha");
								}}
							/>

							<FooterLinks />
						</div>
					</TabsContent>

					<TabsContent className="flex flex-col gap-4 rounded pt-2" value="tabsenha">
						<div className="flex w-full flex-col items-center gap-6">
							<TabRecoveryNewPassword
								onSubmit={async (e) => {
									setValueTab("codigo");
									setPassword(e.password);
								}}
							/>

							<FooterLinks />
						</div>
					</TabsContent>

					<TabsContent className="flex flex-col gap-4 rounded pt-2" value="codigo">
						<div className="flex w-full flex-col items-center gap-6">
							<TabRecoveryCode
								email={email}
								defaultCode={""}
								onBack={() => setValueTab("email")}
								onNext={async (nextCode: string) => {
									await resetPassword({
										newPassword: password,
										token: nextCode,
									});

									navigate(Rotas.desprotegidas.auth.login);
								}}
							/>

							<FooterLinks />
						</div>
					</TabsContent>
				</TabsContents>
			</Tabs>
		</div>
	);
};

const FooterLinks = () => (
	<>
		<div className="flex w-full flex-row items-center gap-3">
			<Separator />
			or
			<Separator />
		</div>
		<CustomLink
			to={Rotas.desprotegidas.auth.register}
			variant="link"
			size="link"
			className="text-muted-foreground font-medium"
		>
			Não possui uma conta? <p className="text-text font-semibold">Registrar Gratuitamente</p>
		</CustomLink>
	</>
);
