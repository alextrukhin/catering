import type { ZodError, z } from "zod";

export const delay = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const padToTwoDigits = (number: number | string) => {
	return number?.toString().length <= 1 ? `0${number}` : `${number}`;
};
export const roundNumber = (num: number, digits = 2) =>
	num ? Math.round(num * 10 ** digits) / 10 ** digits : 0;

export const permutate = <T>(items: T[], count: number) => {
	// The correct technical term is power set. Here is the canonical recursive form
	// Taken and modified from https://stackoverflow.com/a/64512073
	const subsets: T[][] = [[]];

	for (const el of items) {
		const last = subsets.length - 1;
		for (let i = 0; i <= last; i++) {
			const arr = [...subsets[i], el];
			if (arr.length === count) {
				subsets.push(arr);
			}
		}
	}
	const result = subsets.filter((x) => x.length === count);
	return result;
};

export const shuffle = <T>(array: T[]) => {
	const copy = array.slice();
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

export const getRandomArbitrary = (min: number, max: number) => {
	return Math.random() * (max - min) + min;
};

export const zodErrorsFlatten = (errors?: ZodError<any>) => {
	const fieldErrors: Record<string, z.core.$ZodIssue[]> = {};
	errors?.issues.forEach((error) => {
		const path = error.path.join(".");
		if (!fieldErrors[path]) {
			fieldErrors[path] = [];
		}
		fieldErrors[path].push(error);
	});
	return fieldErrors;
};

export const assertInt = (input: number) => {
	if (typeof input === "number" && input >= 2147483647) {
		throw new Error("Integer overflow");
	}
};

export const arraysDiff = <T>(a: T[] | null, b: T[] | null) => {
	const aSet = new Set(a ?? []);
	const bSet = new Set(b ?? []);
	const diff = new Set([...aSet].filter((x) => !bSet.has(x)));
	return Array.from(diff);
};

export const formatTimeAgo = (datetime: string) => {
	const date = new Date(datetime);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);
	const months = Math.floor(weeks / 4);
	const years = Math.floor(months / 12);

	if (years > 0) {
		return `${years} year${years > 1 ? "s" : ""} ago`;
	}
	if (months > 0) {
		return `${months} month${months > 1 ? "s" : ""} ago`;
	}
	if (weeks > 0) {
		return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
	}
	if (days > 0) {
		return `${days} day${days > 1 ? "s" : ""} ago`;
	}
	if (hours > 0) {
		return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	}
	if (minutes > 0) {
		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	}
	if (seconds > 0) {
		return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
	}
	return "just now";
};

export const getFieldInsensitive = <T extends Record<string, any>>(
	obj: T,
	field: string
) => {
	const keys = Object.keys(obj);
	const key = keys.find((k) => k.toLowerCase().trim() === field.toLowerCase());
	return key ? obj[key] : undefined;
};

export const findFirstFieldValueInsensitive = (
	objects: Record<string, number | string>[],
	keys: string[]
) => {
	for (const object of objects) {
		for (const k of keys) {
			const value = getFieldInsensitive(object, k);
			if (value) {
				return value;
			}
		}
	}
	return null;
};

export const downloadFile = (url: string, fileName: string) => {
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
};

// Source: https://stackoverflow.com/questions/75375670
export const replaceTemplateVariables = (
	string: string,
	object: Record<string, Record<string, any>>
) =>
	string.replaceAll(/\{([^}]+)\}/gi, (_, a) =>
		a.split(".").reduce((b, c) => b?.[c], object)
	);

export const SuperscriptMapping = {
	"0": "⁰",
	"1": "¹",
	"2": "²",
	"3": "³",
	"4": "⁴",
	"5": "⁵",
	"6": "⁶",
	"7": "⁷",
	"8": "⁸",
	"9": "⁹",
};

export const arrayToChunks = <T>(arr: T[], amount: number) => {
	let resp = [];
	for (let i = 0; i < arr.length; i += amount) {
		const chunk = arr.slice(i, i + amount);
		resp.push(chunk);
	}
	return resp;
};

export const getYYYYMMDDDateString = (date: Date) => {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
};

// https://stackoverflow.com/a/56919826
export const unflattenObj = (input: Record<string, any>) => {
	return Object.entries(input).reduce(
		(outerObj: Record<string, any>, [key, val]) => {
			if (!key.includes(".")) {
				outerObj[key] = val;
				return outerObj;
			}
			const keys = key.split(".");
			const lastKey = keys.pop()!;
			const lastObj = keys.reduce((a, key) => {
				// Create an object at this key if it doesn't exist yet:
				if (!a[key]) {
					a[key] = {};
				}
				return a[key];
			}, outerObj);
			// We now have a reference to the last object created (or the one that already existed
			// so, just assign the value:
			lastObj[lastKey] = val;
			return outerObj;
		},
		{}
	);
};
