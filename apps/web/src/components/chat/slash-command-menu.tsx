import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/command";
import { cn } from "@/app/utils/cn";

export type SlashCommand = {
	id: string;
	label: string;
	hint?: string;
};

export type SlashCommandMenuProps = {
	open: boolean;
	query: string;
	items: SlashCommand[];
	onSelect: (id: string) => void;
	className?: string;
};

/** Menu flutuante de slash-commands (ancorado acima do composer). Filtra pela query após a "/". */
export const SlashCommandMenu = ({ open, query, items, onSelect, className }: SlashCommandMenuProps) => {
	if (!open) return null;
	const normalized = query.replace(/^\//, "").toLowerCase();
	const filtered = items.filter(
		(item) => item.label.toLowerCase().includes(normalized) || item.hint?.toLowerCase().includes(normalized),
	);

	return (
		<div className={cn("bg-popover absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border shadow-lg", className)}>
			<Command shouldFilter={false}>
				<CommandList>
					<CommandEmpty>Nenhum comando.</CommandEmpty>
					<CommandGroup heading="Rotinas">
						{filtered.map((item) => (
							<CommandItem key={item.id} value={item.id} onSelect={() => onSelect(item.id)} className="flex flex-col items-start gap-0.5">
								<span className="text-sm font-medium">{item.label}</span>
								{item.hint && <span className="text-muted-foreground text-xs">{item.hint}</span>}
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</Command>
		</div>
	);
};
