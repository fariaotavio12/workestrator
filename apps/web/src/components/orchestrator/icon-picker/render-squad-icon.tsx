import { cn } from "@/app/utils/cn";
import { getLucideIcon } from "./lucide-icons";

/** Squads criados antes do IconPicker guardaram um emoji cru em `icon` — mantém compatibilidade. */
export const renderSquadIcon = (icon: string | undefined, className?: string) => {
	if (!icon) return null;

	if (icon.startsWith("lucide:")) {
		const Icon = getLucideIcon(icon.slice("lucide:".length));
		return Icon ? <Icon className={cn("h-4 w-4", className)} /> : null;
	}

	if (icon.startsWith("emoji:")) {
		return <span className={className}>{icon.slice("emoji:".length)}</span>;
	}

	return <span className={className}>{icon}</span>;
};
