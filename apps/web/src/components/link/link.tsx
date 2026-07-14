import React from "react";
import type { LinkProps } from "react-router-dom";
import { buttonVariants } from "@/components/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/app/utils/cn";
import { Link } from "react-router-dom";

export type CustomLinkProps = LinkProps & VariantProps<typeof buttonVariants>;

const CustomLink = React.forwardRef<HTMLAnchorElement, CustomLinkProps>(
	({ className, variant, size, ...props }, ref) => {
		return <Link ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
	},
);
CustomLink.displayName = "Link";

export { CustomLink };
