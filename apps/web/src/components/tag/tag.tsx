import { cn } from "@/app/utils/cn";
import { X } from "lucide-react";
import * as React from "react";

export type TagColor = "rose" | "blue" | "primary" | "yellow" | "violet" | "muted";

export type TagProps = React.HTMLAttributes<HTMLDivElement> & {
	color?: TagColor;
	closable?: boolean;
	onClose?: () => void;
};

const COLOR_MAP: Record<TagColor, string> = {
	rose: "bg-rose/10 text-rose border-rose/20",
	blue: "bg-blue/10 text-blue border-blue/20",
	primary: "bg-primary/10 text-primary border-primary/20",
	yellow: "bg-yellow/10 text-yellow border-yellow/20",
	violet: "bg-violet/10 text-violet border-violet/20",
	muted: "bg-muted text-muted-foreground border-border",
};

export const Tag = React.forwardRef<HTMLDivElement, TagProps>(({ className, color = "muted", closable, onClose, children, ...props }, ref) => {
	return (
		<div ref={ref} className={cn("inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium", COLOR_MAP[color], className)} {...props}>
			{children}
			{closable && (
				<button type="button" onClick={onClose} className="hover:bg-foreground/10 ml-2 rounded-full p-0.5" aria-label="Remover">
					<X className="h-3 w-3" />
				</button>
			)}
		</div>
	);
});
Tag.displayName = "Tag";
