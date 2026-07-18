import { AppBrandIcon, appBrand } from "@/app/config/branding";
import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { CustomLink } from "@/components/link";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/sheet";
import { Typography } from "@/components/typography";
import { MenuIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

const navItems = [
	{ label: "Features", to: `${Rotas.desprotegidas.landingPages.home}#features` },
	{ label: "Explorar", to: Rotas.desprotegidas.landingPages.explore },
	{ label: "Download", to: Rotas.desprotegidas.landingPages.download },
	{ label: "Sugerir melhoria", to: Rotas.desprotegidas.landingPages.participate },
];

/** Superfície "glass" translúcida reaproveitada em todos os controles da navbar. */
const glass = "bg-card/85 border-border hover:bg-muted backdrop-blur-sm";

type NavBarLandingProps = {
	/** Sobreposta a uma cena fullscreen (home/office tour) em vez de barra sticky. */
	overlay?: boolean;
	/** Controles extras injetados antes dos botões de auth (ex.: toggle de som do office tour). */
	rightSlot?: ReactNode;
};

export const NavBarLanding = ({ overlay = false, rightSlot }: NavBarLandingProps) => {
	const { user } = useAuth();
	const location = useLocation();
	const returnState = location.state as { from?: string } | null;
	const loginState = returnState?.from ? { from: returnState.from } : undefined;

	return (
		<nav className={cn("w-full", overlay ? "absolute inset-x-0 top-0 z-40" : "sticky top-0 z-50")}>
			<section
				className={cn(
					"flex items-center justify-between gap-2",
					overlay ? "px-4 py-3.5" : "mx-auto w-full max-w-7xl px-5 py-3 md:px-10 lg:px-20",
				)}
			>
				<CustomLink
					className={cn("text-foreground gap-2", glass)}
					to={Rotas.desprotegidas.landingPages.home}
					variant="ghost"
					size="sm"
					aria-label={appBrand.name}
				>
					<AppBrandIcon className="size-6" />
					<Typography variant="caption" as="span" className="hidden sm:inline">
						{appBrand.name}
					</Typography>
				</CustomLink>

				<div className="bg-card/85 border-border hidden items-center gap-0.5 rounded-lg border px-1 backdrop-blur-sm md:flex">
					{navItems.map((item) => (
						<CustomLink key={item.to} to={item.to} variant="ghost" size="sm" className="hover:bg-muted">
							<Typography variant="nav-link" as="span">
								{item.label}
							</Typography>
						</CustomLink>
					))}
				</div>

				<div className="flex items-center gap-2">
					{rightSlot}

					{user ? (
						<CustomLink to={Rotas.protegidas.dashboards.home} variant="outline" size="sm" className={glass}>
							Dashboard
						</CustomLink>
					) : (
						<>
							<CustomLink
								className={cn("hidden justify-center lg:flex", glass)}
								to={Rotas.desprotegidas.auth.login}
								state={loginState}
								variant="ghost"
								size="sm"
							>
								Login
							</CustomLink>

							<CustomLink
								className="hidden justify-center backdrop-blur-sm sm:flex"
								to={Rotas.desprotegidas.auth.login}
								state={loginState}
								size="sm"
							>
								Acessar demo
							</CustomLink>
						</>
					)}

					<Sheet>
						<SheetTrigger asChild>
							<Button className={cn("flex md:hidden", glass)} variant="ghost" size="icon" aria-label="Abrir menu">
								<MenuIcon />
							</Button>
						</SheetTrigger>

						<SheetContent side="right" className="flex h-screen w-80 flex-col p-6 sm:w-[320px]">
							<SheetHeader>
								<SheetTitle asChild>
									<Typography variant="title-lg">Menu</Typography>
								</SheetTitle>
							</SheetHeader>

							<div className="mt-8 flex h-full flex-col justify-between gap-6">
								<div className="flex flex-col gap-3">
									{navItems.map((item) => (
										<SheetClose key={item.to} asChild>
											<CustomLink
												to={item.to}
												variant="link"
												size="link"
												className="text-foreground hover:text-primary"
											>
												<Typography variant="body-md" as="span">
													{item.label}
												</Typography>
											</CustomLink>
										</SheetClose>
									))}
								</div>

								<div className="flex flex-col gap-3">
									<SheetClose asChild>
										<CustomLink
											to={Rotas.desprotegidas.auth.login}
											state={loginState}
											variant="outline"
											size="sm"
											className="w-full justify-center"
										>
											Login
										</CustomLink>
									</SheetClose>

									<SheetClose asChild>
										<CustomLink
											className="w-full justify-center"
											to={Rotas.desprotegidas.auth.login}
											state={loginState}
											size="sm"
										>
											Acessar demo
										</CustomLink>
									</SheetClose>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</section>
		</nav>
	);
};
