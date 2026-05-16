import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { orgStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import {
	getOrgPermissionFilter,
	getPlanMealPermissionFilter,
	getPlanCoursePermissionFilter,
	getPlanDayPermissionFilter,
	getPlanDayDinerPermissionFilter,
} from "../../utils/permissions";

const mealPlanSelect = {
	id: true,
	organization_id: true,
	label_uk: true,
	label_en: true,
	valid_from: true,
	valid_to: true,
	created_at: true,
	updated_at: true,
	Meals: {
		select: {
			id: true,
			meal_id: true,
			Meal: {
				select: { id: true, label_uk: true, label_en: true, description: true },
			},
			Courses: {
				select: {
					id: true,
					course_id: true,
					Course: {
						select: {
							id: true,
							label_uk: true,
							label_en: true,
							Options: {
								select: {
									id: true,
									Dish: { select: { id: true, name_uk: true, name_en: true } },
								},
							},
						},
					},
					Default: {
						select: { id: true, course_option_id: true },
					},
				},
			},
		},
	},
	Days: {
		select: {
			id: true,
			date: true,
		},
		orderBy: { date: "asc" as const },
	},
} as const;

const mealPlanCreateSchema = z.object({
	label_uk: z.string().min(1).max(200),
	label_en: z.string().min(1).max(200),
	valid_from: z.coerce.date(),
	valid_to: z.coerce.date().optional().nullable(),
});

const mealPlanUpdateSchema = mealPlanCreateSchema.partial().extend({
	id: idSchema,
	valid_to: z.coerce.date().optional().nullable(),
});

const paginationSchema = z.object({
	skip: z.number().int().nonnegative().optional(),
	take: z.number().int().positive().optional(),
});

export default router({
	list: orgStaffProcedure
		.input(paginationSchema.optional())
		.query(async ({ input, ctx: { orgStaff } }) => {
			return await readClient.mealPlan.findMany({
				where: getOrgPermissionFilter(orgStaff!.organization_id),
				select: mealPlanSelect,
				orderBy: { valid_from: "desc" },
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: orgStaffProcedure
		.input(mealPlanCreateSchema)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			return await writeClient.mealPlan.create({
				data: { ...input, organization_id: orgStaff!.organization_id },
				select: mealPlanSelect,
			});
		}),

	update: orgStaffProcedure
		.input(mealPlanUpdateSchema)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const plan = await readClient.mealPlan.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!plan)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meal plan not found",
				});
			const { id, ...data } = input;
			return await writeClient.mealPlan.update({
				where: { id },
				data,
				select: mealPlanSelect,
			});
		}),

	delete: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const plan = await readClient.mealPlan.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!plan)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meal plan not found",
				});
			await writeClient.mealPlan.delete({ where: { id: input.id } });
			return { success: true };
		}),

	/** Returns meals available to this org (from active caterer contracts). */
	listAvailableMeals: orgStaffProcedure.query(async ({ ctx: { orgStaff } }) => {
		const now = new Date();
		const contracts = await readClient.catererClientContract.findMany({
			where: {
				organization_id: orgStaff!.organization_id,
				valid_from: { lte: now },
				OR: [{ valid_to: null }, { valid_to: { gte: now } }],
			},
			select: { caterer_id: true },
		});
		const catererIds = [...new Set(contracts.map((c) => c.caterer_id))];
		return await readClient.meal.findMany({
			where: { caterer_id: { in: catererIds } },
			select: {
				id: true,
				label_uk: true,
				label_en: true,
				description: true,
				caterer_id: true,
				Caterer: { select: { id: true, name_uk: true, name_en: true } },
				Courses: { select: { id: true, label_uk: true, label_en: true } },
			},
			orderBy: { label_uk: "asc" },
		});
	}),

	addMeal: orgStaffProcedure
		.input(z.object({ meal_plan_id: idSchema, meal_id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const plan = await readClient.mealPlan.findFirst({
				where: {
					id: input.meal_plan_id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!plan)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meal plan not found",
				});
			return await writeClient.planMeal.create({
				data: { meal_plan_id: input.meal_plan_id, meal_id: input.meal_id },
				select: {
					id: true,
					meal_id: true,
					Meal: {
						select: {
							id: true,
							label_uk: true,
							label_en: true,
							description: true,
						},
					},
					Courses: {
						select: {
							id: true,
							course_id: true,
							Course: { select: { id: true, label_uk: true, label_en: true } },
						},
					},
				},
			});
		}),

	removeMeal: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const planMeal = await readClient.planMeal.findFirst({
				where: {
					id: input.id,
					...getPlanMealPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!planMeal)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Plan meal not found",
				});
			await writeClient.planMeal.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addCourse: orgStaffProcedure
		.input(z.object({ plan_meal_id: idSchema, course_id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const planMeal = await readClient.planMeal.findFirst({
				where: {
					id: input.plan_meal_id,
					...getPlanMealPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!planMeal)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Plan meal not found",
				});
			return await writeClient.planCourse.create({
				data: {
					plan_meal_id: input.plan_meal_id,
					course_id: input.course_id,
				},
				select: {
					id: true,
					course_id: true,
					Course: { select: { id: true, label_uk: true, label_en: true } },
				},
			});
		}),

	removeCourse: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const planCourse = await readClient.planCourse.findFirst({
				where: {
					id: input.id,
					...getPlanCoursePermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!planCourse)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Plan course not found",
				});
			await writeClient.planCourse.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addDay: orgStaffProcedure
		.input(z.object({ meal_plan_id: idSchema, date: z.coerce.date() }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const plan = await readClient.mealPlan.findFirst({
				where: {
					id: input.meal_plan_id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!plan)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meal plan not found",
				});
			return await writeClient.planDay.create({
				data: { meal_plan_id: input.meal_plan_id, date: input.date },
				select: {
					id: true,
					date: true,
				},
			});
		}),

	removeDay: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const day = await readClient.planDay.findFirst({
				where: {
					id: input.id,
					...getPlanDayPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!day)
				throw new TRPCError({ code: "NOT_FOUND", message: "Day not found" });
			await writeClient.planDay.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addDiner: orgStaffProcedure
		.input(z.object({ plan_day_id: idSchema, diner_id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const day = await readClient.planDay.findFirst({
				where: {
					id: input.plan_day_id,
					...getPlanDayPermissionFilter(orgStaff!.organization_id),
				},
				select: {
					id: true,
					MealPlan: {
						select: {
							Meals: {
								select: {
									Courses: {
										select: {
											id: true,
											Default: { select: { course_option_id: true } },
										},
									},
								},
							},
						},
					},
				},
			});
			if (!day)
				throw new TRPCError({ code: "NOT_FOUND", message: "Day not found" });

			const pdd = await writeClient.planDayDiner.create({
				data: { plan_day_id: input.plan_day_id, diner_id: input.diner_id },
				select: {
					id: true,
					diner_id: true,
					Diner: { select: { id: true, first_name: true, last_name: true } },
				},
			});

			// Auto-fill dish selections from PlanCourseDefault
			const defaults = day.MealPlan.Meals.flatMap((m) =>
				m.Courses.filter((c) => c.Default !== null).map((c) => ({
					plan_day_diner_id: pdd.id,
					plan_course_id: c.id,
					course_option_id: c.Default!.course_option_id,
				}))
			);
			if (defaults.length > 0) {
				await writeClient.dinerDishSelection.createMany({
					data: defaults,
					skipDuplicates: true,
				});
			}

			return pdd;
		}),

	removeDiner: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const entry = await readClient.planDayDiner.findFirst({
				where: {
					id: input.id,
					...getPlanDayDinerPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!entry)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Diner assignment not found",
				});
			await writeClient.planDayDiner.delete({ where: { id: input.id } });
			return { success: true };
		}),

	/** Bulk-add days from a date range, filtered by weekday. */
	addDays: orgStaffProcedure
		.input(
			z.object({
				meal_plan_id: idSchema,
				from: z.coerce.date(),
				to: z.coerce.date(),
				/** 0 = Sun … 6 = Sat. Omit to include every day. */
				weekdays: z.array(z.number().int().min(0).max(6)).optional(),
			})
		)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const plan = await readClient.mealPlan.findFirst({
				where: {
					id: input.meal_plan_id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!plan)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meal plan not found",
				});

			const dates: Date[] = [];
			const cursor = new Date(input.from);
			cursor.setUTCHours(12, 0, 0, 0);
			const end = new Date(input.to);
			end.setUTCHours(12, 0, 0, 0);
			while (cursor <= end) {
				if (!input.weekdays || input.weekdays.includes(cursor.getUTCDay())) {
					dates.push(new Date(cursor));
				}
				cursor.setUTCDate(cursor.getUTCDate() + 1);
			}

			await writeClient.planDay.createMany({
				data: dates.map((date) => ({
					meal_plan_id: input.meal_plan_id,
					date,
				})),
				skipDuplicates: true,
			});
			return { count: dates.length };
		}),

	/** Set (or clear) the default dish for a PlanCourse. */
	setDefault: orgStaffProcedure
		.input(
			z.object({
				plan_course_id: idSchema,
				course_option_id: idSchema.nullable(),
			})
		)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const pc = await readClient.planCourse.findFirst({
				where: {
					id: input.plan_course_id,
					...getPlanCoursePermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!pc)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Plan course not found",
				});

			if (input.course_option_id === null) {
				await writeClient.planCourseDefault.deleteMany({
					where: { plan_course_id: input.plan_course_id },
				});
				return { plan_course_id: input.plan_course_id, course_option_id: null };
			}

			const result = await writeClient.planCourseDefault.upsert({
				where: { plan_course_id: input.plan_course_id },
				create: {
					plan_course_id: input.plan_course_id,
					course_option_id: input.course_option_id,
				},
				update: { course_option_id: input.course_option_id },
				select: { id: true, plan_course_id: true, course_option_id: true },
			});
			return result;
		}),

	/** All plan days in a given month for the calendar page. */
	getCalendarDays: orgStaffProcedure
		.input(
			z.object({
				year: z.number().int().min(2020).max(2100),
				month: z.number().int().min(1).max(12),
			})
		)
		.query(async ({ input, ctx: { orgStaff } }) => {
			const start = new Date(Date.UTC(input.year, input.month - 1, 1));
			const end = new Date(Date.UTC(input.year, input.month, 0));

			return await readClient.planDay.findMany({
				where: {
					date: { gte: start, lte: end },
					...getPlanDayPermissionFilter(orgStaff!.organization_id),
				},
				select: {
					id: true,
					date: true,
					MealPlan: { select: { id: true, label_uk: true, label_en: true } },
				},
				orderBy: { date: "asc" },
			});
		}),

	/** Roster management: all org diners grouped + which ones are assigned to a specific day. */
	getDayRoster: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.query(async ({ input, ctx: { orgStaff } }) => {
			const orgId = orgStaff!.organization_id;
			const [day, groups, allDiners] = await Promise.all([
				readClient.planDay.findFirst({
					where: { id: input.id, ...getPlanDayPermissionFilter(orgId) },
					select: {
						id: true,
						date: true,
						MealPlan: { select: { id: true, label_uk: true, label_en: true } },
						Diners: { select: { id: true, diner_id: true } },
					},
				}),
				readClient.dinerGroup.findMany({
					where: getOrgPermissionFilter(orgId),
					select: {
						id: true,
						name_uk: true,
						name_en: true,
						Members: {
							select: {
								Diner: {
									select: { id: true, first_name: true, last_name: true },
								},
							},
							orderBy: [
								{ Diner: { last_name: "asc" } },
								{ Diner: { first_name: "asc" } },
							],
						},
					},
					orderBy: { name_uk: "asc" },
				}),
				readClient.diner.findMany({
					where: getOrgPermissionFilter(orgId),
					select: { id: true, first_name: true, last_name: true },
					orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
				}),
			]);
			if (!day)
				throw new TRPCError({ code: "NOT_FOUND", message: "Day not found" });
			return { day, groups, allDiners };
		}),

	/** Full day view: date, meal plan structure, all diners with selections and group info. */
	getDay: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.query(async ({ input, ctx: { orgStaff } }) => {
			const day = await readClient.planDay.findFirst({
				where: {
					id: input.id,
					...getPlanDayPermissionFilter(orgStaff!.organization_id),
				},
				select: {
					id: true,
					date: true,
					MealPlan: {
						select: {
							id: true,
							label_uk: true,
							label_en: true,
							Meals: {
								select: {
									id: true,
									Meal: {
										select: { id: true, label_uk: true, label_en: true },
									},
									Courses: {
										select: {
											id: true,
											Course: {
												select: { id: true, label_uk: true, label_en: true },
											},
										},
									},
								},
							},
						},
					},
					Diners: {
						select: {
							id: true,
							diner_id: true,
							Diner: {
								select: {
									id: true,
									first_name: true,
									last_name: true,
									Groups: {
										select: {
											Group: {
												select: { id: true, name_uk: true, name_en: true },
											},
										},
										orderBy: { Group: { name_uk: "asc" } },
									},
								},
							},
							DishSelections: {
								select: {
									id: true,
									plan_course_id: true,
									CourseOption: {
										select: {
											Dish: {
												select: { id: true, name_uk: true, name_en: true },
											},
										},
									},
								},
							},
						},
						orderBy: [
							{ Diner: { last_name: "asc" } },
							{ Diner: { first_name: "asc" } },
						],
					},
				},
			});
			if (!day)
				throw new TRPCError({ code: "NOT_FOUND", message: "Day not found" });
			return day;
		}),
});
