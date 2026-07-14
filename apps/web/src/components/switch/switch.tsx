import { cn } from "@/app/utils/cn";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";

export type SwitchSize = "sm" | "md" | "lg";

export type SwitchProps = Omit<FieldWrapperProps, "className" | "children"> &
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
		size?: SwitchSize;
	};

const rootSizeClasses: Record<SwitchSize, string> = {
	sm: "h-5 w-9",
	md: "h-6 w-11",
	lg: "h-7 w-14",
};

const thumbSizeClasses: Record<SwitchSize, string> = {
	sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
	md: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
	lg: "h-6 w-6 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0",
};

const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitives.Root>, SwitchProps>(
	({ className, label, error, description, id, size = "md", ...props }, ref) => (
		<FieldWrapper htmlFor={id} label={label} error={error} description={description} className={className}>
			<SwitchPrimitives.Root
				id={id}
				className={cn(
					"peer inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 shadow-inner transition-colors",
					"focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
					"disabled:cursor-default disabled:opacity-50",
					"data-[state=checked]:border-primary/30 data-[state=checked]:bg-primary data-[state=unchecked]:border-input-border data-[state=unchecked]:bg-muted",
					rootSizeClasses[size],
				)}
				{...props}
				ref={ref}
			>
				<SwitchPrimitives.Thumb
					className={cn(
						"bg-card data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full shadow-sm ring-0 transition-transform",
						thumbSizeClasses[size],
					)}
				/>
			</SwitchPrimitives.Root>
		</FieldWrapper>
	),
);
Switch.displayName = "Switch";

export { Switch };
