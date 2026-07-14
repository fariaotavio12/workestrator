import { cn } from "@/app/utils/cn";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";

const Checkbox = React.forwardRef<
	React.ComponentRef<typeof CheckboxPrimitive.Root>,
	Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, "checked"> & {
		checked?: CheckboxPrimitive.CheckedState;
	}
>(({ checked, className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		checked={checked}
		className={cn(
			"peer border-input-border bg-input h-4 w-4 shrink-0 rounded border shadow-sm transition-colors",
			"ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
			"disabled:cursor-default disabled:opacity-50",
			"data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
			"data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
			className,
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
			{checked === "indeterminate" ? (
				<span className="block h-0.5 w-3 rounded-sm bg-current" />
			) : (
				<CheckIcon className="h-4 w-4" />
			)}
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
