import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { OrderBy } from "~~/shared/types";
import { assertInt, unflattenObj } from "~~/shared/utils";

export const parseOrderBy = (orderBy?: OrderBy) => {
	if (!orderBy) return undefined;
	return orderBy.map((order) => {
		if (order.field?.includes(".")) {
			let parts = order.field.split(".");

			if (parts.length < 2) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Invalid orderBy field, must be in format 'relation.field' or 'field' or '_count.field'",
				});
			}

			// for compatibility:
			if (parts[parts.length - 2] === "_count") {
				// StepQuestion._count.TrialVariants -> StepQuestion.TrialVariants._count
				parts = [
					...parts.slice(0, parts.length - 2),
					parts[parts.length - 1]!,
					"_count",
				];
			}

			return unflattenObj({
				[parts.join(".")]: order.direction,
			});
		} else {
			return {
				[order.field]: order.direction,
			};
		}
	});
};

export const parseOrderBySQL = (orderBy?: OrderBy) => {
	if (!orderBy) return "";
	return `ORDER BY ${orderBy
		.map((order) => {
			const field = order.field.includes(".")
				? order.field.split(".")[1]
				: order.field;
			return `"${field}" ${order.direction}`;
		})
		.join(", ")}`;
};

export const assertId = (id: number) => {
	try {
		assertInt(id);
	} catch (e) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid ID",
		});
	}
};

export const jsonFormDataField = z.string().transform((str, ctx) => {
	try {
		return JSON.parse(str);
	} catch (e) {
		ctx.addIssue({ code: "custom", message: "Invalid JSON" });
		return z.NEVER;
	}
});
