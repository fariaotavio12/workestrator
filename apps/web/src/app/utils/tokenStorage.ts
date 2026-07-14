const TOKEN_KEY = "auth_token";

export const tokenStorage = {
	async save(token: string): Promise<void> {
		localStorage.setItem(TOKEN_KEY, token);
	},

	async get(): Promise<string | null> {
		return localStorage.getItem(TOKEN_KEY);
	},

	async clear(): Promise<void> {
		localStorage.removeItem(TOKEN_KEY);
	},
};
