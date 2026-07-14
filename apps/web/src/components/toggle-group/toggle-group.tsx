"use client";

import { cn } from "@/app/utils/cn";
import { toggleVariants } from "@/components/toggle";
import { type VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";

const ToggleGroupContext = React.createContext<
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
		orientation?: "horizontal" | "vertical";
	}
>({
	size: "default",
	variant: "default",
	spacing: 0,
	orientation: "horizontal",
});

function ToggleGroup({
	className,
	variant,
	size,
	spacing = 0,
	orientation = "horizontal",
	children,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
		orientation?: "horizontal" | "vertical";
	}) {
	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			data-orientation={orientation}
			style={{ "--gap": spacing } as React.CSSProperties}
			className={cn(
				"group/toggle-group flex w-fit items-center overflow-hidden rounded-lg " +
					"gap-[--spacing(var(--gap))]" +
					"data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
				className,
			)}
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive.Root>
	);
}

function ToggleGroupItem({
	className,
	children,
	variant = "default",
	size = "default",
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext);

	return (
		<ToggleGroupPrimitive.Item
			data-slot="toggle-group-item"
			data-variant={context.variant || variant}
			data-size={context.size || size}
			data-spacing={context.spacing}
			className={cn(
				"shrink-0 focus:z-10 focus-visible:z-10 " +
					// quando spacing=0, quem arredonda são as pontas
					"group-data-[spacing=0]/toggle-group:rounded-none" +
					// horizontal
					"group-data-[orientation=horizontal]/toggle-group:group-data-[spacing=0]/toggle-group:first:rounded-l-md" +
					"group-data-[orientation=horizontal]/toggle-group:group-data-[spacing=0]/toggle-group:last:rounded-r-md" +
					// vertical
					"group-data-[orientation=vertical]/toggle-group:group-data-[spacing=0]/toggle-group:first:rounded-t-md" +
					"group-data-[orientation=vertical]/toggle-group:group-data-[spacing=0]/toggle-group:last:rounded-b-md" +
					// bordas entre itens (outline)
					"group-data-[orientation=horizontal]/toggle-group:group-data-[spacing=0]/toggle-group:data-[variant=outline]:border-l-0" +
					"group-data-[orientation=vertical]/toggle-group:group-data-[spacing=0]/toggle-group:data-[variant=outline]:border-t-0" +
					"group-data-[orientation=horizontal]/toggle-group:group-data-[spacing=0]/toggle-group:data-[variant=outline]:first:border-l" +
					"group-data-[orientation=vertical]/toggle-group:group-data-[spacing=0]/toggle-group:data-[variant=outline]:first:border-t",
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				className,
			)}
			{...props}
		>
			{children}
		</ToggleGroupPrimitive.Item>
	);
}

export { ToggleGroup, ToggleGroupItem };
