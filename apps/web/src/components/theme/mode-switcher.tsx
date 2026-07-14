import { useHotkey } from "@/app/hooks/useHotkey";
import { useTheme } from "@/app/providers/useThemeContext";
import { Button } from "@/components/button";
import { Kbd } from "@/components/kbd";
import { Switch } from "@/components/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";
import { Moon, SunMedium } from "lucide-react";
import * as React from "react";

export const DARK_MODE_FORWARD_TYPE = "dark-mode-forward";

export const ModeSwitcher = () => {
	const { setTheme, theme } = useTheme();
	//   const { setMetaColor, metaColor } = useMetaColor()

	//   React.useEffect(() => {
	//     setMetaColor(metaColor)
	//   }, [metaColor, setMetaColor])

	const toggleTheme = React.useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [theme, setTheme]);

	useHotkey({ key: ["d", "D"], ctrl: false, meta: false }, toggleTheme);

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="sidebar" className="mx-1 justify-start rounded-lg px-1" onClick={toggleTheme}>
						{theme === "dark" ? <Moon className="ml-1 size-4" /> : <SunMedium className="ml-1 size-4" />}
						<span>Tema</span>
						<Switch checked={theme == "dark"} className="ml-auto" size="sm" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="flex items-center gap-2 pr-1">
					Alternar tema <Kbd>D</Kbd>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// export function DarkModeScript() {
//   return (
//     <Script
//       id="dark-mode-listener"
//       strategy="beforeInteractive"
//       dangerouslySetInnerHTML={{
//         __html: `
//             (function() {
//               // Forward D key
//               document.addEventListener('keydown', function(e) {
//                 if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey) {
//                   if (
//                     (e.target instanceof HTMLElement && e.target.isContentEditable) ||
//                     e.target instanceof HTMLInputElement ||
//                     e.target instanceof HTMLTextAreaElement ||
//                     e.target instanceof HTMLSelectElement
//                   ) {
//                     return;
//                   }
//                   e.preventDefault();
//                   if (window.parent && window.parent !== window) {
//                     window.parent.postMessage({
//                       type: '${DARK_MODE_FORWARD_TYPE}',
//                       key: e.key
//                     }, '*');
//                   }
//                 }
//               });

//             })();
//           `,
//       }}
//     />
//   )
// }
