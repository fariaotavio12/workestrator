import { cn } from "@/app/utils/cn";
import React, { forwardRef, type TextareaHTMLAttributes } from "react";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";

export type TextareaProps = Omit<FieldWrapperProps, "className" | "children"> &
	TextareaHTMLAttributes<HTMLTextAreaElement> & {
		containerClassName?: string;
		showCharCounter?: boolean;
		maxLength?: number;
	};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			containerClassName,
			className,
			label,
			error,
			description,
			id,
			maxLength,
			value,
			showCharCounter,
			onChange,
			...props
		},
		ref,
	) => {
		const charCount = typeof value === "string" ? value.length : 0;

		const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (onChange) {
				onChange(e);
			}
		};

		return (
			<FieldWrapper
				htmlFor={id}
				label={label}
				error={error}
				description={description}
				className={containerClassName}
				showCharCounter={showCharCounter}
				length={charCount}
				maxLength={maxLength}
			>
				<textarea
					ref={ref}
					onChange={handleChange}
					value={value}
					className={cn(
						"border-input-border bg-input ring-offset-background flex w-full rounded-lg border px-4 py-3 text-sm transition-all",
						"file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
						"placeholder:text-muted-foreground",
						"focus-within:border-ring focus-within:ring-ring/10 focus-within:ring-[3px]",
						"focus-visible:outline-none",
						"disabled:bg-muted disabled:text-locked-foreground disabled:opacity-60",
						error && "border-destructive/45 focus-within:border-destructive focus-within:ring-destructive/10",
						className,
					)}
					{...props}
				/>
				{/* {(showCharCounter || maxLength) && (
          <div className="text-muted-foreground flex justify-end text-xs">
            {showCharCounter && (
              <span>
                {charCount}
                {maxLength ? `/${maxLength}` : ""}
              </span>
            )}
          </div>
        )} */}
			</FieldWrapper>
		);
	},
);
