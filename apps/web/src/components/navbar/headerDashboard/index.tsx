import { cn } from "@/app/utils/cn";
import { BreadCrumbComponent } from "@/components/bread-crumb/bread-crumb";
import { CustomLink } from "@/components/link";
import { Separator } from "@/components/separator";
import { SidebarTrigger, useSidebar } from "@/components/sidebar";
import { getMobileSidebarItems, type SidebarNavItem } from "@/components/sidebar/variables";
import { Ellipsis, Settings } from "lucide-react";
import { useLocation } from "react-router";

export const HeaderDashboardDesktop = () => {
	return (
		<header className="bg-background hidden h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-16 sm:flex">
			<div className="flex items-center gap-3 px-6">
				<SidebarTrigger className="-ml-1 rounded-full" />
				<Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
				<BreadCrumbComponent />
			</div>
		</header>
	);
};

export const HeaderDashboardMobile = () => {
	const { toggleSidebar } = useSidebar();
	const mobileItems = getMobileSidebarItems();

	return (
		<header className="bg-background/95 fixed right-0 bottom-0 left-0 z-10 flex h-16 shrink-0 items-center gap-3 border-t [box-shadow:var(--mobile-nav-shadow)] backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:hidden">
			<div className="flex w-full items-center justify-between gap-2 px-4">
				{mobileItems.map((item) => (
					<ButtonDashMobile key={item.url} item={item} />
				))}
				<button
					type="button"
					onClick={toggleSidebar}
					className="hover:bg-accent hover:text-primary flex h-12 max-w-10 flex-1 flex-col items-center justify-center gap-1 rounded-full text-center transition-colors"
				>
					<span className="relative">
						<Ellipsis className="h-5 w-5" />
						<Settings className="bg-background absolute -right-2 -bottom-1 h-3 w-3 rounded-full" />
					</span>
					<span className="text-muted-foreground text-[11px] leading-none">Mais</span>
				</button>
			</div>
		</header>
	);
};

const ButtonDashMobile = ({ item }: { item: SidebarNavItem }) => {
	const { pathname } = useLocation();
	const Icon = item.icon;

	return (
		<CustomLink
			to={item.url}
			variant="ghost"
			className={cn(
				"flex h-12 flex-col items-center justify-center gap-1 rounded-full p-1 text-center",
				pathname === item.url && "bg-accent text-primary",
			)}
		>
			{Icon ? <Icon /> : null}
			<span className="text-[11px] leading-none">{item.title}</span>
		</CustomLink>
	);
};
