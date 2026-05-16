import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { catererStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import {
	getCatererPermissionFilter,
	getCoursePermissionFilter,
	getCoursePeriodPermissionFilter,
	getCourseOptionPermissionFilter,
} from "../../utils/permissions";

const courseSelect = {
	id: true,
	meal_id: true,
	label_uk: true,
	label_en: true,
	Meal: {
		select: { id: true, label_uk: true, label_en: true, caterer_id: true },
	},
	Periods: {
		select: { id: true, valid_from: true, valid_to: true },
		orderBy: { valid_from: "asc" as const },
	},
	Options: {
		select: {
			id: true,
			dish_id: true,
			Dish: { select: { id: true, name_uk: true, name_en: true } },
		},
	},
} as const;

const periodSchema = z.object({
	valid_from: z.coerce.date(),
	valid_to: z.coerce.date().optional().nullable(),
});

const periodUpdateSchema = periodSchema.partial().extend({ id: idSchema });

export default router({
	list: catererStaffProcedure
		.input(
			z
				.object({
					skip: z.number().int().nonnegative().optional(),
					take: z.number().int().positive().optional(),
					meal_id: idSchema.optional(),
				})
				.optional()
		)
		.query(async ({ input, ctx: { catererStaff } }) => {
			return await readClient.course.findMany({
				where: {
					...getCoursePermissionFilter(catererStaff!.caterer_id),
					...(input?.meal_id ? { meal_id: input.meal_id } : {}),
				},
				select: courseSelect,
				orderBy: { label_uk: "asc" },
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: catererStaffProcedure
		.input(
			z.object({
				meal_id: idSchema,
				label_uk: z.string().min(1).max(200),
				label_en: z.string().min(1).max(200),
			})
		)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const meal = await readClient.meal.findFirst({
				where: {
					id: input.meal_id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!meal)
				throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found" });
			return await writeClient.course.create({
				data: {
					label_uk: input.label_uk,
					label_en: input.label_en,
					meal_id: input.meal_id,
				},
				select: courseSelect,
			});
		}),

	update: catererStaffProcedure
		.input(
			z.object({
				id: idSchema,
				label_uk: z.string().min(1).max(200).optional(),
				label_en: z.string().min(1).max(200).optional(),
			})
		)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const course = await readClient.course.findFirst({
				where: {
					id: input.id,
					...getCoursePermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!course)
				throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
			return await writeClient.course.update({
				where: { id: input.id },
				data: { label_uk: input.label_uk, label_en: input.label_en },
				select: courseSelect,
			});
		}),

	delete: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const course = await readClient.course.findFirst({
				where: {
					id: input.id,
					...getCoursePermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!course)
				throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
			await writeClient.course.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addOption: catererStaffProcedure
		.input(z.object({ course_id: idSchema, dish_id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const course = await readClient.course.findFirst({
				where: {
					id: input.course_id,
					...getCoursePermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!course)
				throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
			return await writeClient.courseOption.create({
				data: { course_id: input.course_id, dish_id: input.dish_id },
				select: {
					id: true,
					dish_id: true,
					Dish: { select: { id: true, name: true } },
				},
			});
		}),

	removeOption: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const option = await readClient.courseOption.findFirst({
				where: {
					id: input.id,
					...getCourseOptionPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!option)
				throw new TRPCError({ code: "NOT_FOUND", message: "Option not found" });
			await writeClient.courseOption.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addPeriod: catererStaffProcedure
		.input(z.object({ course_id: idSchema, ...periodSchema.shape }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const course = await readClient.course.findFirst({
				where: {
					id: input.course_id,
					...getCoursePermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!course)
				throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
			return await writeClient.coursePeriod.create({
				data: {
					course_id: input.course_id,
					valid_from: input.valid_from,
					valid_to: input.valid_to ?? null,
				},
			});
		}),

	updatePeriod: catererStaffProcedure
		.input(periodUpdateSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const period = await readClient.coursePeriod.findFirst({
				where: {
					id: input.id,
					...getCoursePeriodPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!period)
				throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" });
			const { id, ...data } = input;
			return await writeClient.coursePeriod.update({ where: { id }, data });
		}),

	removePeriod: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const period = await readClient.coursePeriod.findFirst({
				where: {
					id: input.id,
					...getCoursePeriodPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!period)
				throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" });
			await writeClient.coursePeriod.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
