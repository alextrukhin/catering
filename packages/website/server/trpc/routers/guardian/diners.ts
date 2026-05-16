import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { guardianProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";

export default router({
	list: guardianProcedure.query(async ({ ctx }) => {
		return await readClient.guardianDiner.findMany({
			where: { guardian_id: ctx.guardian!.id },
			select: {
				id: true,
				Diner: {
					select: {
						id: true,
						first_name: true,
						last_name: true,
					},
				},
			},
		});
	}),

	calendarDays: guardianProcedure
		.input(
			z.object({
				diner_id: idSchema,
				year: z.number().int().min(2020).max(2100),
				month: z.number().int().min(1).max(12),
			})
		)
		.query(async ({ input, ctx }) => {
			const link = await readClient.guardianDiner.findFirst({
				where: {
					guardian_id: ctx.guardian!.id,
					diner_id: input.diner_id,
				},
				select: { id: true },
			});
			if (!link) throw new TRPCError({ code: "NOT_FOUND" });

			const start = new Date(Date.UTC(input.year, input.month - 1, 1));
			const end = new Date(Date.UTC(input.year, input.month, 0));

			const records = await readClient.planDayDiner.findMany({
				where: {
					diner_id: input.diner_id,
					PlanDay: { date: { gte: start, lte: end } },
				},
				select: {
					id: true,
					PlanDay: {
						select: {
							date: true,
							MealPlan: {
								select: {
									label_uk: true,
									label_en: true,
									Meals: {
										select: {
											Courses: { select: { id: true } },
										},
									},
								},
							},
						},
					},
					DishSelections: {
						select: {
							id: true,
							CourseOption: {
								select: { Dish: { select: { name_uk: true, name_en: true } } },
							},
						},
					},
				},
				orderBy: { PlanDay: { date: "asc" } },
			});

			return records.map((r) => {
				const totalCourses = r.PlanDay.MealPlan.Meals.reduce(
					(sum, m) => sum + m.Courses.length,
					0
				);
				const selectedCourses = r.DishSelections.length;
				return {
					id: r.id,
					date: r.PlanDay.date,
					plan_label_uk: r.PlanDay.MealPlan.label_uk,
					plan_label_en: r.PlanDay.MealPlan.label_en,
					total_courses: totalCourses,
					selected_courses: selectedCourses,
					is_complete: totalCourses > 0 && selectedCourses >= totalCourses,
					dish_names: r.DishSelections.map((s) => s.CourseOption.Dish.name_uk),
				};
			});
		}),

	dinerDay: guardianProcedure
		.input(z.object({ plan_day_diner_id: idSchema, diner_id: idSchema }))
		.query(async ({ input, ctx }) => {
			const link = await readClient.guardianDiner.findFirst({
				where: {
					guardian_id: ctx.guardian!.id,
					diner_id: input.diner_id,
				},
				select: { id: true },
			});
			if (!link) throw new TRPCError({ code: "NOT_FOUND" });

			const record = await readClient.planDayDiner.findFirst({
				where: { id: input.plan_day_diner_id, diner_id: input.diner_id },
				select: {
					id: true,
					PlanDay: {
						select: {
							date: true,
							MealPlan: {
								select: {
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
														select: {
															id: true,
															label_uk: true,
															label_en: true,
															Options: {
																select: {
																	id: true,
																	dish_id: true,
																	Dish: {
																		select: {
																			id: true,
																			name_uk: true,
																			name_en: true,
																			weight: true,
																			ingredients: true,
																			notes: true,
																			photo_id: true,
																			Prices: {
																				select: {
																					price: true,
																					valid_from: true,
																					valid_to: true,
																				},
																			},
																		},
																	},
																},
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
					DishSelections: {
						select: {
							id: true,
							plan_course_id: true,
							course_option_id: true,
						},
					},
				},
			});
			if (!record) throw new TRPCError({ code: "NOT_FOUND" });
			return record;
		}),

	setDish: guardianProcedure
		.input(
			z.object({
				plan_day_diner_id: idSchema,
				diner_id: idSchema,
				plan_course_id: idSchema,
				course_option_id: idSchema.nullable(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const link = await readClient.guardianDiner.findFirst({
				where: { guardian_id: ctx.guardian!.id, diner_id: input.diner_id },
				select: { id: true },
			});
			if (!link) throw new TRPCError({ code: "NOT_FOUND" });

			const pdd = await readClient.planDayDiner.findFirst({
				where: { id: input.plan_day_diner_id, diner_id: input.diner_id },
				select: { id: true },
			});
			if (!pdd) throw new TRPCError({ code: "NOT_FOUND" });

			if (input.course_option_id === null) {
				await writeClient.dinerDishSelection.deleteMany({
					where: {
						plan_day_diner_id: input.plan_day_diner_id,
						plan_course_id: input.plan_course_id,
					},
				});
				return { deleted: true, id: null, course_option_id: null };
			}

			return await writeClient.dinerDishSelection.upsert({
				where: {
					plan_day_diner_id_plan_course_id: {
						plan_day_diner_id: input.plan_day_diner_id,
						plan_course_id: input.plan_course_id,
					},
				},
				create: {
					plan_day_diner_id: input.plan_day_diner_id,
					plan_course_id: input.plan_course_id,
					course_option_id: input.course_option_id,
				},
				update: { course_option_id: input.course_option_id },
				select: { id: true, course_option_id: true },
			});
		}),

	copyDay: guardianProcedure
		.input(
			z.object({
				diner_id: idSchema,
				source_id: idSchema,
				target_ids: z.array(idSchema).min(1).max(31),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const link = await readClient.guardianDiner.findFirst({
				where: { guardian_id: ctx.guardian!.id, diner_id: input.diner_id },
				select: { id: true },
			});
			if (!link) throw new TRPCError({ code: "NOT_FOUND" });

			const source = await readClient.planDayDiner.findFirst({
				where: { id: input.source_id, diner_id: input.diner_id },
				select: {
					DishSelections: {
						select: { plan_course_id: true, course_option_id: true },
					},
				},
			});
			if (!source) throw new TRPCError({ code: "NOT_FOUND" });

			const targets = await readClient.planDayDiner.findMany({
				where: { id: { in: input.target_ids }, diner_id: input.diner_id },
				select: { id: true },
			});

			for (const target of targets) {
				await writeClient.dinerDishSelection.deleteMany({
					where: { plan_day_diner_id: target.id },
				});
				if (source.DishSelections.length > 0) {
					await writeClient.dinerDishSelection.createMany({
						data: source.DishSelections.map((s) => ({
							plan_day_diner_id: target.id,
							plan_course_id: s.plan_course_id,
							course_option_id: s.course_option_id,
						})),
						skipDuplicates: true,
					});
				}
			}

			return { copied: targets.length };
		}),
});
