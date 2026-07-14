import { useTheme } from "@/app/providers/useThemeContext";
import { cn } from "@/app/utils/cn";
import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useCallback } from "react";

const themes = [
	{
		key: "system",
		icon: Monitor,
		label: "Tema do sistema",
	},
	{
		key: "light",
		icon: Sun,
		label: "Tema claro",
	},
	{
		key: "dark",
		icon: Moon,
		label: "Tema escuro",
	},
];
export type ThemeSwitcherProps = {
	value?: "light" | "dark" | "system";

	defaultValue?: "light" | "dark" | "system";
	className?: string;
};
export const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
	const { setTheme, theme } = useTheme();
	const handleThemeClick = useCallback(
		(themeKey: "light" | "dark" | "system") => {
			setTheme(themeKey);
		},
		[setTheme],
	);

	return (
		<div className={cn("bg-muted/70 ring-border relative isolate flex h-9 rounded-full p-1 ring-1", className)}>
			{themes.map(({ key, icon: Icon, label }) => {
				const isActive = theme === key;
				return (
					<button
						aria-label={label}
						className="hover:bg-accent relative h-7 w-7 rounded-full transition-colors"
						key={key}
						onClick={() => handleThemeClick(key as "light" | "dark" | "system")}
						type="button"
					>
						{isActive && (
							<motion.div
								className="bg-card absolute inset-0 rounded-full shadow-sm"
								layoutId="activeTheme"
								transition={{ type: "spring", duration: 0.5 }}
							/>
						)}
						<Icon className={cn("relative z-10 m-auto h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
					</button>
				);
			})}
		</div>
	);
};
