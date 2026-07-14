import type { ApiRequestParams } from "@/app/api/types";

export type LoginRequestDto = {
	email: string;
	password: string;
};

export type AuthResponseDto = {
	userId: string;
	email: string;
	tokenExpiresAt: string;
	message: string;
	token: string;
};

export type UserRole = "ADMIN" | "STAFF";

export type CurrentUserResponseDto = {
	userId: string;
	name: string;
	email: string;
	role: UserRole;
	img?: string;
	companyId?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

/** Bate com `RegisterRequest` do backend — só o essencial, sem conceito de empresa/tenant. */
export type RegisterUserRequestDto = {
	name: string;
	email: string;
	password: string;
};

/** Backend devolve o mesmo shape do login (`AuthResponse`) — já autentica a conta recém-criada. */
export type RegisterUserResponseDto = AuthResponseDto;

export type SendEmailVerificationCodeRequestDto = {
	email: string;
};

export type SendEmailVerificationCodeResponseDto = {
	email: string;
	message: string;
	expiresInSeconds: number;
};

export type GoogleAuthUrlResponseDto = Record<string, string>;

export type AuthDtoResponse = LoginRequestDto;

export type authDtoResponse = AuthDtoResponse;

export type GetUsersFilters = {
	companyId?: string;
};

export type UserResponseDto = {
	id: string;
	role: UserRole;
	name: string;
	email: string;
	companyId?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type UserDtoResponse = CurrentUserResponseDto;

export type CreateUserRequest = {
	name: string;
	email: string;
	password: string;
	role: UserRole;
	companyId?: string;
};

export type UpdateUserRequest = {
	name: string;
	role?: UserRole;
	isActive?: boolean;
	companyId?: string;
};

export type GetUsersParams = ApiRequestParams<UserResponseDto, GetUsersFilters>;
