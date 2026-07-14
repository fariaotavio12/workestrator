import { api, tanStackQueryClient } from "@/app/api/clients";
import type { PageResultApiResponse } from "@/app/api/types";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { authKeys } from "./keys";
import type {
	authDtoResponse,
	AuthResponseDto,
	CreateUserRequest,
	CurrentUserResponseDto,
	GetUsersParams,
	RegisterUserRequestDto,
	RegisterUserResponseDto,
	SendEmailVerificationCodeRequestDto,
	SendEmailVerificationCodeResponseDto,
	UpdateUserRequest,
	UserResponseDto,
} from "./types";

const USER_CACHE_STALE_TIME_MS = 5 * 60 * 1000;
const USER_CACHE_GC_TIME_MS = 30 * 60 * 1000;

const authUser = async (credentials: authDtoResponse): Promise<AuthResponseDto> => {
	const { data } = await api.post("/auth/login", credentials);
	return data;
};

export const useAuthUser = () => {
	return useMutation({
		mutationFn: authUser,
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "Não foi possível autenticar o usuário"));
		},
	});
};

const authGoogleUser = async (_: string): Promise<AuthResponseDto> => {
	const { data } = await api.get("/auth/google/login?registrationId=google");
	return data;
};

export const useAuthGoogleUser = () => {
	return useMutation({
		mutationFn: authGoogleUser,
	});
};

const passwordRecovery = async (email: string) => {
	const { data } = await api.post("/auth/password-recovery", { email });
	return data;
};

export const useRequestPasswordRecovery = () => {
	return useMutation({
		mutationFn: passwordRecovery,
	});
};

const sendEmailVerificationCode = async (email: string) => {
	const payload: SendEmailVerificationCodeRequestDto = { email };
	const { data } = await api.post<SendEmailVerificationCodeResponseDto>("/auth/email/verification-code", payload);
	return data;
};

export const useSendEmailVerificationCode = () => {
	return useMutation({
		mutationFn: sendEmailVerificationCode,
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "Não foi possível enviar o código de verificação"));
		},
		onSuccess: () => {
			notify.success("Código de verificação enviado para o e-mail informado.");
		},
	});
};

const registerUser = async (payload: RegisterUserRequestDto): Promise<RegisterUserResponseDto> => {
	const { data } = await api.post("/auth/register", payload);
	return data;
};

export const useRegisterUser = () => {
	return useMutation({
		mutationFn: registerUser,
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "Não foi possível registrar o usuário"));
		},
		onSuccess: () => {
			notify.success("Usuário registrado com sucesso.");
		},
	});
};

export const getUserMe = async (): Promise<CurrentUserResponseDto> => {
	const { data } = await api.get("/auth/me");
	return data;
};

export const useGetUserMe = (
	options?: Omit<UseQueryOptions<CurrentUserResponseDto, AxiosError | Error>, "queryKey">,
) => {
	return useQuery({
		queryKey: authKeys.me(),
		queryFn: getUserMe,
		...options,
	});
};

const logoutUser = async () => {
	const { data } = await api.post("/auth/logout");
	return data;
};

export const useLogoutUser = () => {
	return useMutation({
		mutationFn: logoutUser,
	});
};

const resetPassword = async ({ newPassword, token }: { token: string; newPassword: string }) => {
	const payload = { token, newPassword };
	const { data } = await api.post<SendEmailVerificationCodeResponseDto>("/auth/password/reset", payload);
	return data;
};

export const useResetPassword = () => {
	return useMutation({
		mutationFn: resetPassword,
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "Não foi possível redefinir a senha"));
		},
		onSuccess: () => {
			notify.success("Senha redefinida com sucesso.");
		},
	});
};

const sendEmailVerificationCodeForgotPassword = async (email: string) => {
	const payload = { email };
	const { data } = await api.post<SendEmailVerificationCodeResponseDto>("/auth/password/forgot", payload);
	return data;
};

export const useSendEmailVerificationCodeForgotPassword = () => {
	return useMutation({
		mutationFn: sendEmailVerificationCodeForgotPassword,
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "Não foi possível enviar o código de verificação"));
		},
		onSuccess: () => {
			notify.success("Código de verificação enviado para o e-mail informado.");
		},
	});
};

const confirmPasswordChange = async ({ code, newPassword }: { code: string; newPassword: string }) => {
	const { data } = await api.post("/auth/password/reset", {
		code,
		newPassword,
	});
	return data;
};

export const useConfirmPasswordChange = () =>
	useMutation({
		mutationFn: confirmPasswordChange,
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "Não foi possível alterar a senha"));
		},
	});

const getUsers = async (params?: GetUsersParams) => {
	const { size, page, filter, sort } = params || {};
	const query = new URLSearchParams();

	if (page !== undefined) query.append("page", String(page));
	if (size !== undefined) query.append("size", String(size));

	if (filter?.companyId) {
		query.append("companyId", filter.companyId);
	}

	if (sort?.length) {
		query.append("sortBy", String(sort[0].by));
		query.append("sortDesc", sort[0].direction === "desc" ? "true" : "false");
	}

	const url = `/users${query.toString() ? `?${query.toString()}` : ""}`;
	const { data } = await api.get<PageResultApiResponse<UserResponseDto>>(url);
	return data;
};

export const useGetUsers = (
	params?: GetUsersParams,
	options?: Omit<UseQueryOptions<PageResultApiResponse<UserResponseDto>>, "queryKey">,
) => {
	return useQuery({
		queryKey: authKeys.usersList(params),
		queryFn: () => getUsers(params),
		staleTime: USER_CACHE_STALE_TIME_MS,
		gcTime: USER_CACHE_GC_TIME_MS,
		refetchOnWindowFocus: false,
		...options,
	});
};

export const getUserById = async (id?: string): Promise<UserResponseDto> => {
	const { data } = await api.get(`/users/${id}`);
	return data;
};

export const useGetUserById = (
	id?: string,
	options?: Omit<UseQueryOptions<UserResponseDto, AxiosError | Error>, "queryKey">,
) => {
	const enabled = !!id && !!options?.enabled;
	return useQuery({
		queryKey: authKeys.userDetail(id!),
		queryFn: () => getUserById(id!),
		...options,
		enabled,
	});
};

const createUser = async (payload: CreateUserRequest) => {
	const { data } = await api.post("/users", payload);
	return data;
};

export const useCreateUser = () => {
	return useMutation({
		mutationFn: createUser,
		onSuccess: () => {
			tanStackQueryClient.invalidateQueries({ queryKey: authKeys.users() });
			notify.success("Usuário criado com sucesso");
		},
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "erro inesperado"));
		},
	});
};

type UpdateUserParams = {
	id: string;
	value: UpdateUserRequest;
};

const updateUser = async ({ id, value }: UpdateUserParams) => {
	const { data } = await api.put(`/users/${id}`, value);
	return data;
};

export const useUpdateUser = () => {
	return useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			tanStackQueryClient.invalidateQueries({ queryKey: authKeys.users() });
			notify.success("Usuário atualizado com sucesso");
		},
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "erro inesperado"));
		},
	});
};

const activateUser = async (id: string) => {
	const { data } = await api.post(`/users/${id}/activate`);
	return data;
};

const deactivateUser = async (id: string) => {
	const { data } = await api.post(`/users/${id}/deactivate`);
	return data;
};

export const useActivateUser = () => {
	return useMutation({
		mutationFn: activateUser,
		onSuccess: () => {
			tanStackQueryClient.invalidateQueries({ queryKey: authKeys.users() });
			notify.success("Usuário ativado com sucesso");
		},
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "erro inesperado"));
		},
	});
};

export const useDeactivateUser = () => {
	return useMutation({
		mutationFn: deactivateUser,
		onSuccess: () => {
			tanStackQueryClient.invalidateQueries({ queryKey: authKeys.users() });
			notify.success("Usuário desativado com sucesso");
		},
		onError: (e: unknown) => {
			notify.error(getApiErrorMessage(e, "erro inesperado"));
		},
	});
};
