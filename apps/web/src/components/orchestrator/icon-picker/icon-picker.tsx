import { cn } from "@/app/utils/cn";
import {
	Input,
	Popover,
	PopoverContent,
	PopoverTrigger,
	ScrollArea,
	Tabs,
	TabsContent,
	TabsContents,
	TabsList,
	TabsTrigger,
	Typography,
} from "@/components";
import { Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { LUCIDE_ICON_OPTIONS } from "./lucide-icons";

const EMOJIS = [
	"📁",
	"📂",
	"📄",
	"📝",
	"📌",
	"⭐",
	"❤️",
	"🔥",
	"🚀",
	"💡",
	"🎯",
	"✅",
	"📊",
	"📈",
	"📉",
	"💰",
	"🏆",
	"🔒",
	"🔑",
	"🖥️",
	"💻",
	"🗄️",
	"☁️",
	"🌐",
	"⚙️",
	"🛠️",
	"🐛",
	"📦",
	"🚚",
	"👥",
	"👤",
	"📅",
	"⏰",
	"📞",
	"✉️",
	"🔔",
	"🎨",
	"🎬",
	"🎵",
	"📷",
	"🏠",
	"🏢",
	"💼",
	"📚",
	"🔖",
	"🏷️",
	"🧩",
	"⚡",
	"✨",
	"🧠",
	"🛡️",
	"🤝",
];

type IconPickerProps = {
	value: string | null | undefined;
	onSelect: (icon: string) => void;
	onClear: () => void;
	children: ReactNode;
};

export const IconPicker = ({ value, onSelect, onClear, children }: IconPickerProps) => {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const normalizedSearch = search.trim().toLowerCase();

	const filteredIcons = useMemo(() => {
		if (!normalizedSearch) return LUCIDE_ICON_OPTIONS;

		return LUCIDE_ICON_OPTIONS.filter(
			(icon) => icon.name.includes(normalizedSearch) || icon.label.toLowerCase().includes(normalizedSearch),
		);
	}, [normalizedSearch]);

	const handleSelect = (icon: string) => {
		onSelect(icon);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent align="start" className="w-80 p-0">
				<Tabs defaultValue="icons">
					<div className="flex items-center justify-between gap-2 border-b p-2">
						<TabsList className="h-8">
							<TabsTrigger value="icons" className="text-xs">
								Ícones
							</TabsTrigger>
							<TabsTrigger value="emoji" className="text-xs">
								Emoji
							</TabsTrigger>
						</TabsList>
						{value && (
							<button
								type="button"
								className="text-muted-foreground hover:text-destructive flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
								onClick={() => {
									onClear();
									setOpen(false);
								}}
							>
								<X className="h-3.5 w-3.5" />
								Remover
							</button>
						)}
					</div>
					<TabsContents>
						<TabsContent value="icons" className="p-2">
							<Input
								name="squad-icon-search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Buscar ícone"
								inputSize="sm"
								wrapperClassName="w-full"
								className="pl-11"
								iconLeft={<Search className="text-muted-foreground h-4 w-4" />}
							/>
							<ScrollArea className="mt-2 h-72 pr-2">
								{filteredIcons.length === 0 && (
									<Typography variant="body-sm" className="text-muted-foreground px-1 py-4 text-center">
										Nenhum ícone encontrado
									</Typography>
								)}
								<div className="grid grid-cols-8 gap-1">
									{filteredIcons.map(({ name, label, Icon }) => (
										<button
											key={name}
											type="button"
											title={label}
											aria-label={label}
											className={cn(
												"text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors",
												value === `lucide:${name}` && "bg-accent text-primary",
											)}
											onClick={() => handleSelect(`lucide:${name}`)}
										>
											<Icon className="h-4 w-4" />
										</button>
									))}
								</div>
							</ScrollArea>
						</TabsContent>
						<TabsContent value="emoji" className="p-2">
							<ScrollArea className="h-72 pr-2">
								<div className="grid grid-cols-8 gap-1">
									{EMOJIS.map((emoji) => (
										<button
											key={emoji}
											type="button"
											className={cn(
												"hover:bg-accent flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors",
												value === `emoji:${emoji}` && "bg-accent",
											)}
											onClick={() => handleSelect(`emoji:${emoji}`)}
										>
											{emoji}
										</button>
									))}
								</div>
							</ScrollArea>
						</TabsContent>
					</TabsContents>
				</Tabs>
			</PopoverContent>
		</Popover>
	);
};
