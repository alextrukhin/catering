import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { timingSafeEqual } from "node:crypto";

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_DKLEN = 64;

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
