import { AppBrandIcon, appBrand } from "@/app/config/branding";
import { Rotas } from "@/app/routing/variables";
import { CustomLink } from "@/components/link";
import { Typography } from "@/components/typography";

const footerGroups = [
	{
		title: "Product",
		links: [
			{ label: "Features", to: `${Rotas.desprotegidas.landingPages.home}#features` },
			{ label: "Included", to: `${Rotas.desprotegidas.landingPages.home}#included` },
			{ label: "Stack", to: `${Rotas.desprotegidas.landingPages.home}#stack` },
			{ label: "Download", to: Rotas.desprotegidas.landingPages.download },
			{ label: "Sugerir melhoria", to: Rotas.desprotegidas.landingPages.participate },
		],
	},
	{
		title: "Platform",
		links: [
			{ label: "Dashboard", to: Rotas.protegidas.dashboards.home },
			{ label: "Releases", to: Rotas.desprotegidas.landingPages.download },
			{ label: "Login demo", to: Rotas.desprotegidas.auth.login },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "Home", to: Rotas.desprotegidas.landingPages.home },
			{ label: "Melhorias", to: Rotas.desprotegidas.landingPages.participate },
			{ label: "Register", to: Rotas.desprotegidas.auth.register },
			{ label: "Privacy", to: Rotas.desprotegidas.landingPages.privacyPolicy },
		],
	},
	{
		title: "Resources",
		links: [
			{ label: "Help center", to: Rotas.desprotegidas.landingPages.knowledgeBase.helpCenter },
			{ label: "FAQ", to: Rotas.desprotegidas.landingPages.knowledgeBase.faq },
			{ label: "Status", to: Rotas.desprotegidas.designSystem },
		],
	},
];

export const FooterLanding = () => {
	return (
		<footer className="bg-background w-full border-t">
			<div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-12 md:px-10 lg:grid-cols-[1.1fr_1.9fr] lg:px-20 lg:py-16">
				<div className="flex max-w-sm flex-col gap-6">
					<CustomLink
						className="text-foreground flex w-fit items-center gap-3"
						to={Rotas.desprotegidas.landingPages.home}
						variant="link"
						size="link"
					>
						<AppBrandIcon className="size-10" />
						<Typography variant="title-sm" as="span">
							{appBrand.name}
						</Typography>
					</CustomLink>

					<Typography variant="body-md" className="text-muted-foreground">
						{appBrand.footerDescription}
					</Typography>
				</div>

				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{footerGroups.map((group) => (
						<div key={group.title} className="flex flex-col gap-4">
							<Typography variant="caption" className="text-foreground">
								{group.title}
							</Typography>
							<nav className="flex flex-col items-start gap-3">
								{group.links.map((link) => (
									<CustomLink
										key={`${group.title}-${link.label}`}
										to={link.to}
										variant="link"
										size="link"
										className="text-muted-foreground hover:text-primary"
									>
										<Typography variant="caption" as="span">
											{link.label}
										</Typography>
									</CustomLink>
								))}
							</nav>
						</div>
					))}
				</div>
			</div>

			<div className="border-t">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-20">
					<Typography variant="caption" className="text-muted-foreground">
						© {appBrand.name} {new Date().getFullYear()}
					</Typography>
					<div className="flex flex-wrap gap-4">
						<CustomLink
							to={Rotas.desprotegidas.landingPages.privacyPolicy}
							variant="link"
							size="link"
							className="text-muted-foreground hover:text-primary"
						>
							<Typography variant="caption" as="span">
								Privacy Policy
							</Typography>
						</CustomLink>
						<CustomLink
							to={Rotas.desprotegidas.designSystem}
							variant="link"
							size="link"
							className="text-muted-foreground hover:text-primary"
						>
							<Typography variant="caption" as="span">
								Security
							</Typography>
						</CustomLink>
					</div>
				</div>
			</div>
		</footer>
	);
};
