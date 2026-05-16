import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import jsonwebtoken from "jsonwebtoken";

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_DKLEN = 64;

export const authCookieNames = {
	orgStaff: {
		token: "jwt_org",
		authenticated: "org_authenticated",
	},
	catererStaff: {
		token: "jwt_caterer",
		authenticated: "caterer_authenticated",
	},
	guardian: {
		token: "jwt_guardian",
		authenticated: "guardian_authenticated",
	},
	diner: {
		token: "jwt_diner",
		authenticated: "diner_authenticated",
	},
} as const;

export const getAuthCookieOptions = (ageInDays: number, httpOnly: boolean) => ({
	httpOnly,
	maxAge: 60 * 60 * 24 * ageInDays,
	sameSite: "lax" as const,
	secure: process.env.NODE_ENV === "production",
});

/** Hashes a plain-text password. Returns `iterations:saltHex:hashHex`. */
export const hashPassword = (password: string): string => {
	const salt = randomBytes(32);
	const hash = pbkdf2(sha512, password, salt, {
		c: PBKDF2_ITERATIONS,
		dkLen: PBKDF2_DKLEN,
	});
	return `${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(hash)}`;
};

/** Timing-safe password verification. */
export const verifyPassword = (password: string, stored: string): boolean => {
	const parts = stored.split(":");
	if (parts.length !== 3) return false;
	const iterStr = parts[0]!;
	const saltHex = parts[1]!;
	const expectedHex = parts[2]!;
	const iterations = parseInt(iterStr, 10);
	if (!Number.isFinite(iterations) || iterations <= 0) return false;
	const salt = hexToBytes(saltHex);
	const expected = hexToBytes(expectedHex);
	const actual = pbkdf2(sha512, password, salt, {
		c: iterations,
		dkLen: expected.byteLength,
	});
	return timingSafeEqual(actual, expected);
};

/** Issues a session JWT and sets auth cookies. */
export const issueSessionCookies = (
	event: H3Event,
	sessionId: number,
	ageDays: number,
	cookieNames: { token: string; authenticated: string }
) => {
	const token = jsonwebtoken.sign(
		{ session_id: sessionId },
		process.env.JWT_SECRET!,
		{ expiresIn: `${ageDays}d` }
	);
	setCookie(
		event,
		cookieNames.token,
		token,
		getAuthCookieOptions(ageDays, true)
	);
	setCookie(
		event,
		cookieNames.authenticated,
		"true",
		getAuthCookieOptions(ageDays, false)
	);
};
