import type { GetUsersParams } from "./types";

export const authKeys = {
	all: ["auth"] as const,
	me: () => [...authKeys.all, "me"] as const,
	users: () => [...authKeys.all, "users"] as const,
	usersList: (params?: GetUsersParams) => [...authKeys.users(), "list", params ?? {}] as const,
	userDetail: (id: string) => [...authKeys.users(), "detail", id] as const,
};
