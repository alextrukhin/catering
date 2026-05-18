import { readClient } from "prismaclient";
import { catererStaffProcedure, router } from "../../trpc";
import { z } from "zod";

export default router({
	query: catererStaffProcedure
		.input(z.object({ date: z.coerce.date() }))
		.query(async ({ input, ctx: { catererStaff } }) => {
			const caterer_id = catererStaff!.caterer_id;
			// Normalise to UTC midnight so it matches the @db.Date column
			const d = input.date;
			const date = new Date(
				Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
			);

			const planDays = await readClient.planDay.findMany({
				where: {
					date,
					MealPlan: {
						Organization: {
							Contracts: {
								some: {
									caterer_id,
									valid_from: { lte: date },
									OR: [{ valid_to: null }, { valid_to: { gte: date } }],
								},
							},
						},
					},
				},
				select: {
					id: true,
					MealPlan: {
						select: {
							Organization: {
								select: { id: true, name_uk: true, name_en: true },
							},
							Meals: {
								select: {
									Meal: {
										select: { id: true, label_uk: true, label_en: true },
									},
								},
							},
						},
					},
					Diners: { select: { id: true } },
				},
			});

			console.log("planDays", planDays);

			type Row = {
				org_id: number;
				org_name_uk: string;
				org_name_en: string;
				meal_id: number;
				meal_label_uk: string;
				meal_label_en: string;
				count: number;
			};

			const map = new Map<string, Row>();

			for (const day of planDays) {
				const { Organization, Meals } = day.MealPlan;
				const dinerCount = day.Diners.length;

				for (const { Meal } of Meals) {
					const key = `${Organization.id}:${Meal.id}`;
					const existing = map.get(key);
					if (existing) {
						existing.count += dinerCount;
					} else {
						map.set(key, {
							org_id: Organization.id,
							org_name_uk: Organization.name_uk,
							org_name_en: Organization.name_en,
							meal_id: Meal.id,
							meal_label_uk: Meal.label_uk,
							meal_label_en: Meal.label_en,
							count: dinerCount,
						});
					}
				}
			}

			return Array.from(map.values()).sort(
				(a, b) =>
					a.org_name_uk.localeCompare(b.org_name_uk) ||
					a.meal_label_uk.localeCompare(b.meal_label_uk)
			);
		}),
});
