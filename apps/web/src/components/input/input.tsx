import { cn } from "@/app/utils/cn";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";
import { cva, type VariantProps } from "class-variance-authority";
import React, { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

const inputVariants = cva(
	[
		"border-input-border bg-input flex w-full rounded-lg border px-4 py-3 text-sm transition-all",
		"file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
		"placeholder:text-muted-foreground",
		"outline-none focus:border-ring focus:bg-background focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_10%,transparent)]",
		"focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_10%,transparent)]",
		"disabled:cursor-not-allowed disabled:bg-muted disabled:text-locked-foreground disabled:opacity-60",
	].join(" "),
	{
		variants: {
			inputSize: {
				default: "h-10",
				sm: "h-9 px-3 text-sm",
				lg: "h-12 text-base",
			},
			variant: {
				default: "",
				ghost: "border-transparent bg-transparent",
				filled: "bg-muted/60",
			},
		},
		defaultVariants: {
			inputSize: "default",
			variant: "default",
		},
	},
);

export type InputProps = Omit<FieldWrapperProps, "className" | "children" | "size"> &
	InputHTMLAttributes<HTMLInputElement> &
	VariantProps<typeof inputVariants> & {
		iconLeft?: ReactNode;
		iconRight?: ReactNode;
		wrapperClassName?: string;
		showCharCounter?: boolean;
		maxLength?: number;

		// placeholder truncate
		truncatePlaceholder?: boolean;
	};

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			wrapperClassName,
			type,
			label,
			error,
			description,
			iconLeft,
			iconRight,
			value,
			id,
			inputSize,
			variant,
			readOnly,
			showCharCounter,
			maxLength,
			onChange,
			truncatePlaceholder = true,
			...props
		},
		ref,
	) => {
		const [charCount, setCharCount] = useState(typeof value === "string" ? value.length : 0);

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setCharCount(e.target.value.length);
			onChange?.(e);
		};

		return (
			<FieldWrapper
				htmlFor={id}
				label={label}
				error={error}
				description={description}
				className={wrapperClassName}
				maxLength={maxLength}
				length={charCount}
				showCharCounter={showCharCounter}
			>
				<div className={cn("relative flex w-full flex-row")}>
					{iconLeft && (
						<span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">{iconLeft}</span>
					)}

					<input
						value={value}
						onChange={handleChange}
						className={cn(
							inputVariants({ inputSize, variant }),
							iconLeft && "pl-8",
							iconRight && "pr-8",

							// placeholder truncate (precisa do overflow/ellipsis no input)
							truncatePlaceholder && "overflow-hidden text-ellipsis whitespace-nowrap",

							// erro
							error && "border-destructive/40",
							error &&
								"focus:border-destructive focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--destructive)_18%,transparent)]",
							error &&
								"focus-visible:border-destructive focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--destructive)_18%,transparent)]",

							readOnly && "bg-muted/60",
							className,
						)}
						type={type}
						ref={ref}
						readOnly={readOnly}
						maxLength={maxLength}
						{...props}
					/>

					{iconRight && (
						<span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">{iconRight}</span>
					)}
				</div>
			</FieldWrapper>
		);
	},
);
