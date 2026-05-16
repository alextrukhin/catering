import { createHmac } from "node:crypto";

/**
 * Validates Telegram WebApp initData against a bot token.
 * Returns parsed key=value pairs (excluding hash) or null if invalid/expired.
 */
export function validateTelegramInitData(
	initDataRaw: string,
	botToken: string,
	maxAgeSeconds = 3600
): Record<string, string> | null {
	const params = new URLSearchParams(initDataRaw);
	const hash = params.get("hash");
	if (!hash) return null;

	// Check auth_date freshness
	const authDate = Number(params.get("auth_date") ?? 0);
	if (authDate && Date.now() / 1000 - authDate > maxAgeSeconds) return null;

	params.delete("hash");
	const dataCheckString = [...params.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");

	const secretKey = createHmac("sha256", "WebAppData")
		.update(botToken)
		.digest();
	const expectedHash = createHmac("sha256", secretKey)
		.update(dataCheckString)
		.digest("hex");

	if (expectedHash !== hash) return null;

	const result: Record<string, string> = {};
	for (const [k, v] of params.entries()) result[k] = v;
	return result;
}

/** Extracts the Telegram user ID from validated initData params. */
export function getTelegramUserId(
	params: Record<string, string>
): bigint | null {
	try {
		const user = JSON.parse(params["user"] ?? "");
		return BigInt(user.id);
	} catch {
		return null;
	}
}
