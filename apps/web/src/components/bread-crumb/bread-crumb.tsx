import { cn } from "@/app/utils/cn";
import { breadcrumbMap } from "@/components/bread-crumb/breadcrumbMap";
import { CustomLink } from "@/components/link";
import { Slot } from "radix-ui";

import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Rotas } from "@/app/routing/variables";

function resolveBreadcrumbLabel(path: string, segment: string): string | null {
	if (breadcrumbMap[path]) {
		return breadcrumbMap[path];
	}

	if (segment === "criar") return "Criar";
	if (segment === "editar") return "Editar";

	if (/^\d+$/.test(segment)) {
		return null;
	}

	return null;
}

export const BreadCrumbComponent = () => {
	const location = useLocation();

	const segments = location.pathname.split("/").filter(Boolean);

	const breadcrumbs = segments
		.map((_, index) => {
			const path = "/" + segments.slice(0, index + 1).join("/");
			return {
				path,
				label: resolveBreadcrumbLabel(path, segments[index]),
			};
		})
		.filter((b) => b.label);

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<CustomLink variant={"ghost"} size={"icon"} to={Rotas.protegidas.dashboards.home}>
							<Home className="h-5 w-5" />
							<span className="sr-only">Dashboard</span>
						</CustomLink>
					</BreadcrumbLink>
				</BreadcrumbItem>

				{breadcrumbs.map((crumb, index) => (
					<span key={crumb.path} className="flex items-center gap-2">
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							{index === breadcrumbs.length - 1 ? (
								<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link to={crumb.path}>{crumb.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</span>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
};

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
	return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(
				"text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
				className,
			)}
			{...props}
		/>
	);
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
	return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

function BreadcrumbLink({
	asChild,
	className,
	...props
}: React.ComponentProps<"a"> & {
	asChild?: boolean;
}) {
	const Comp = asChild ? Slot.Root : "a";

	return (
		<Comp data-slot="breadcrumb-link" className={cn("hover:text-foreground transition-colors", className)} {...props} />
	);
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="breadcrumb-page"
			role="link"
			aria-disabled="true"
			aria-current="page"
			className={cn("text-foreground font-normal", className)}
			{...props}
		/>
	);
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			className={cn("[&>svg]:size-3.5", className)}
			{...props}
		>
			{children ?? <ChevronRight />}
		</li>
	);
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="breadcrumb-ellipsis"
			role="presentation"
			aria-hidden="true"
			className={cn("flex size-9 items-center justify-center", className)}
			{...props}
		>
			<MoreHorizontal className="size-4" />
			<span className="sr-only">More</span>
		</span>
	);
}

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
};
