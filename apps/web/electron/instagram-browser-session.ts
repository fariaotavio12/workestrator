import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const LOGIN_URL = "https://www.instagram.com/accounts/login/";
const INSTAGRAM_APP_ID = "936619743392459";
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 2_000;

let profilesRoot = path.resolve(process.cwd(), "instagram-profiles");

export const configureInstagramProfilesRoot = (root: string): void => {
	profilesRoot = path.resolve(root);
	mkdirSync(profilesRoot, { recursive: true });
};

export const getInstagramProfilesRoot = (): string => profilesRoot;

const findInstalledBrowser = (): string | undefined => {
	const candidates = [
		process.env.IG_BROWSER,
		"C:/Program Files/Google/Chrome/Application/chrome.exe",
		"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
		"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
		"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	];
	return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
};

type InstagramIdentity = {
	accountExternalId: string;
	accountDisplayName: string;
};

export type InstagramBrowserSessionResult = InstagramIdentity & {
	profileId: string;
};

export const connectInstagramBrowserSession = async (): Promise<InstagramBrowserSessionResult> => {
	process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";
	const { chromium } = await import("playwright");
	const profileId = randomUUID();
	const profileDir = path.join(profilesRoot, profileId, "profile");
	mkdirSync(profileDir, { recursive: true });

	const executablePath = findInstalledBrowser();
	const context = await chromium.launchPersistentContext(profileDir, {
		headless: false,
		...(executablePath ? { executablePath } : {}),
		viewport: null,
		args: ["--no-first-run", "--no-default-browser-check", "--disable-blink-features=AutomationControlled"],
	});
	let closedByUser = false;
	context.on("close", () => {
		closedByUser = true;
	});

	try {
		const page = context.pages()[0] ?? (await context.newPage());
		await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
		const deadline = Date.now() + LOGIN_TIMEOUT_MS;

		while (Date.now() < deadline && !closedByUser) {
			const cookies = await context.cookies("https://www.instagram.com");
			const userId = cookies.find((cookie) => cookie.name === "ds_user_id" && cookie.value)?.value;
			if (userId) {
				let username: string | undefined;
				try {
					username = await page.evaluate(
						async ({ appId, id }) => {
							const options = { headers: { "x-ig-app-id": appId }, credentials: "include" as const };
							for (const url of [`/api/v1/users/${id}/info/`, "/api/v1/accounts/current_user/?edit=true"]) {
								try {
									const response = await fetch(url, options);
									if (!response.ok) continue;
									const payload = (await response.json()) as { user?: { username?: string } };
									if (payload.user?.username) return payload.user.username;
								} catch {
									// Try the fallback endpoint.
								}
							}
							return undefined;
						},
						{ appId: INSTAGRAM_APP_ID, id: userId },
					);
				} catch {
					// A navegação pós-login pode recriar o contexto; o ID do cookie ainda identifica a conta.
				}
				return {
					profileId,
					accountExternalId: userId,
					accountDisplayName: username ? `@${username}` : `Instagram ${userId}`,
				};
			}
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
		}
		if (closedByUser) throw new Error("A janela do Instagram foi fechada antes de concluir o login.");
		throw new Error("O tempo para entrar no Instagram expirou. Tente conectar novamente.");
	} finally {
		if (!closedByUser) await context.close().catch(() => undefined);
	}
};
