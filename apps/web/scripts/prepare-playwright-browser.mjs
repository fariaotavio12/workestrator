import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const playwrightCli = fileURLToPath(new URL("../node_modules/playwright/cli.js", import.meta.url));
const result = spawnSync(process.execPath, [playwrightCli, "install", "chromium"], {
	stdio: "inherit",
	env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: "0" },
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
