import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { catererStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import {
	getCatererPermissionFilter,
	getMealPeriodPermissionFilter,
} from "../../utils/permissions";

const mealSelect = {
	id: true,
	label_uk: true,
	label_en: true,
	description: true,
	caterer_id: true,
	created_at: true,
	updated_at: true,
	Periods: { select: { id: true, valid_from: true, valid_to: true } },
	Courses: { select: { id: true, label_uk: true, label_en: true } },
} as const;

const periodSchema = z.object({
	valid_from: z.coerce.date(),
	valid_to: z.coerce.date().optional().nullable(),
});

const mealCreateSchema = z.object({
	label_uk: z.string().min(1).max(200),
	label_en: z.string().min(1).max(200),
	description: z.string().max(500).optional(),
	periods: periodSchema.array().optional(),
});

const mealUpdateSchema = mealCreateSchema
	.omit({ periods: true })
	.partial()
	.extend({ id: idSchema });

const periodUpdateSchema = periodSchema.partial().extend({ id: idSchema });

const paginationSchema = z.object({
	skip: z.number().int().nonnegative().optional(),
	take: z.number().int().positive().optional(),
});

export default router({
	list: catererStaffProcedure
		.input(paginationSchema.optional())
		.query(async ({ input, ctx: { catererStaff } }) => {
			return await readClient.meal.findMany({
				where: getCatererPermissionFilter(catererStaff!.caterer_id),
				select: mealSelect,
				orderBy: { label_uk: "asc" },
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: catererStaffProcedure
		.input(mealCreateSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			return await writeClient.meal.create({
				data: {
					label_uk: input.label_uk,
					label_en: input.label_en,
					description: input.description,
					caterer_id: catererStaff!.caterer_id,
					Periods: input.periods?.length
						? { create: input.periods }
						: undefined,
				},
				select: mealSelect,
			});
		}),

	update: catererStaffProcedure
		.input(mealUpdateSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const meal = await readClient.meal.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!meal) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found" });
			}
			const { id, ...data } = input;
			return await writeClient.meal.update({
				where: { id },
				data,
				select: mealSelect,
			});
		}),

	delete: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const meal = await readClient.meal.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!meal) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found" });
			}
			await writeClient.meal.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addPeriod: catererStaffProcedure
		.input(z.object({ meal_id: idSchema, ...periodSchema.shape }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const meal = await readClient.meal.findFirst({
				where: {
					id: input.meal_id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!meal) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found" });
			}
			return await writeClient.mealPeriod.create({
				data: {
					meal_id: input.meal_id,
					valid_from: input.valid_from,
					valid_to: input.valid_to,
				},
			});
		}),

	updatePeriod: catererStaffProcedure
		.input(periodUpdateSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const period = await readClient.mealPeriod.findFirst({
				where: {
					id: input.id,
					...getMealPeriodPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!period) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" });
			}
			const { id, ...data } = input;
			return await writeClient.mealPeriod.update({
				where: { id },
				data,
			});
		}),

	removePeriod: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const period = await readClient.mealPeriod.findFirst({
				where: {
					id: input.id,
					...getMealPeriodPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!period) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" });
			}
			await writeClient.mealPeriod.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
