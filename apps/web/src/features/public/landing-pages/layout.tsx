import { FooterLanding } from "@/components/footer";
import { NavBarLanding } from "@/components/navbar/navbarLanding";
import { Outlet } from "react-router-dom";

export const LayoutLandingPages = () => {
	return (
		<>
			<div className="flex w-full flex-col">
				<NavBarLanding />
				<main className="bg-background flex min-h-[50vw] w-full flex-col items-center">
					<Outlet />
				</main>
				<FooterLanding />
			</div>
		</>
	);
};

/** Sem o header global — usado na home, cujo hero (office tour) tem seu próprio HUD flutuante. */
export const LayoutLandingPagesNoHeader = () => {
	return (
		<div className="flex w-full flex-col">
			<main className="bg-background flex w-full flex-col items-center">
				<Outlet />
			</main>
			<FooterLanding />
		</div>
	);
};
