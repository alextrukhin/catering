import z from "zod";
import type { CatererStaffType } from "prismaclient";
import { CatererStaffTypeLabels } from "prismaclient/enums";

export type OrderBy = z.infer<typeof orderBy>;

export type TableColumn = {
	label: string;
	field: string;
	cell?: string;
	sort?: "number" | "string";
	width?: number;
	customCellClick?: boolean;
};

export type Nullable<T> =
	T extends Array<infer U>
		? Array<Nullable<U>>
		: T extends object
			? { [P in keyof T]: Nullable<T[P]> }
			: T | null;

const MAX_INT = 2147483647;

export const IdSchema = z.number().int().positive().max(MAX_INT);
export const idSchema = IdSchema;
export const IndexSchema = z.number().int().nonnegative().max(MAX_INT);
export const FileNamePartSchema = z.string().regex(/^[\w,\s-]+$/);
export const colorHEXSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/gm, {
	message:
		"Invalid color format. Must be a 7-character hex code (e.g., #FFFFFF) or a 4-character hex code (e.g., #FFF).",
});
export const decimalSchema = z.number().refine(
	(n) => {
		const precision = n.toString().split(".")[1];
		return !precision || precision.length <= 2;
	},
	{ message: "Max precision is 2 decimal places" }
);

export const orderBy = z
	.object({
		field: z.string(),
		direction: z.enum(["asc", "desc"]),
	})
	.array();

export const dateTimeSchema = z.date().or(z.iso.datetime());

export const userTypeSchema = z.enum(
	Object.keys(CatererStaffTypeLabels) as CatererStaffType[],
	{
		message: "User type is required",
	}
);
