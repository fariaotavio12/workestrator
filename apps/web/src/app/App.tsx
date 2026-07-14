import { AppProvider } from "@/app/providers/appProvider";
import { AppRouter } from "@/app/routing";

export const App = () => {
	return (
		<AppProvider>
			<AppRouter />
		</AppProvider>
	);
};
