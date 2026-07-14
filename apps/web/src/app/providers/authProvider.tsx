import { authKeys, getUserMe, useAuthUser, useLogoutUser, useRegisterUser } from "@/features/public/auth/api";
import type { authDtoResponse, RegisterUserRequestDto } from "@/features/public/auth/api";
import type { UserDtoResponse } from "@/features/public/auth/api";
import { tanStackQueryClient } from "@/app/api/clients";
import { useNotificationWatcher } from "@/app/hooks/useNotificationWatcher";
import { tokenStorage } from "@/app/utils/tokenStorage";
import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type AuthContextProps = {
	user?: UserDtoResponse;
	setUser: Dispatch<SetStateAction<UserDtoResponse | undefined>>;
	login: (userCredentials: authDtoResponse) => Promise<void>;
	register: (data: RegisterUserRequestDto) => Promise<void>;
	logout: () => void;
	refetchUser: () => Promise<void>;
	isAdmin: boolean;
	isLoading: boolean;
	isInitializing: boolean;
};

const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const { mutateAsync: authUser, isPending: isLoggingIn } = useAuthUser();
	const { mutateAsync: registerUser, isPending: isRegistering } = useRegisterUser();
	const [user, setUser] = useState<UserDtoResponse | undefined>(undefined);
	const [isInitializing, setIsInitializing] = useState(true);
	const { mutateAsync: logoutApi } = useLogoutUser();
	const isLoading = useMemo(() => isLoggingIn || isRegistering, [isLoggingIn, isRegistering]);
	const isAdmin = user?.role === "ADMIN";

	useNotificationWatcher(!!user);

	// Busca via `queryClient.fetchQuery` (não o `useQuery`/`refetch` de um hook) de propósito: essa
	// chamada roda dentro de um `useEffect` no mount e não pode depender do ciclo de vida de nenhum
	// observer de componente. Presa a um hook, o StrictMode (monta -> desmonta -> monta de novo em
	// dev) derruba o observer no meio da requisição e a promise de `refetch()` nunca resolve nem
	// rejeita — `isInitializing` fica travado em `true` pra sempre. `fetchQuery` é só a queryKey/cache,
	// sem observer nenhum, então sobrevive ao remount duplo do StrictMode.
	const loadUserData = async () => {
		try {
			const userData = await tanStackQueryClient.fetchQuery({ queryKey: authKeys.me(), queryFn: getUserMe });
			setUser(userData ?? undefined);
		} catch {
			setUser(undefined);
		} finally {
			setIsInitializing(false);
		}
	};

	// Auth por cookie HttpOnly (setado pelo backend no login) — o axios já manda `withCredentials`.
	// Também guarda o token em `tokenStorage` (Bearer) como caminho alternativo, sem custo extra.
	const login = async (userCredentials: authDtoResponse) => {
		const response = await authUser(userCredentials);
		if (response.token) {
			await tokenStorage.save(response.token);
			// Deixa o MCP server externo (electron/mcp-server) autenticar sozinho, sem copiar o token
			// manualmente — não faz nada fora do Electron (método ausente no navegador).
			await window.__ORCH_API__?.cacheSessionToken?.(response.token, response.tokenExpiresAt);
		}
		await loadUserData();
	};

	// Backend devolve o mesmo shape do login (AuthResponse) e já autentica — mesma rotina do login.
	const register = async (data: RegisterUserRequestDto) => {
		const response = await registerUser(data);
		if (response.token) {
			await tokenStorage.save(response.token);
			await window.__ORCH_API__?.cacheSessionToken?.(response.token, response.tokenExpiresAt);
		}
		await loadUserData();
	};

	const logout = () => {
		setUser(undefined);
		tokenStorage.clear();
		void window.__ORCH_API__?.clearSessionToken?.();
		logoutApi();
	};

	useEffect(() => {
		const url = new URL(window.location.href);
		const token = url.searchParams.get("token");
		if (token) {
			tokenStorage.save(token);
			url.searchParams.delete("token");
			window.history.replaceState({}, "", url);
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect
		loadUserData();
	}, []);

	return (
		<AuthContext.Provider
			value={{
				user,
				setUser,
				login,
				register,
				logout,
				refetchUser: loadUserData,
				isAdmin,
				isLoading,
				isInitializing,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
	return context;
};
