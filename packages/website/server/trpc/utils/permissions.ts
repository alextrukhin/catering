/**
 * Permission filter utilities — return Prisma `where` fragments that restrict
 * queries to data owned by the authenticated user's caterer/organisation.
 * Used in every router except user.ts.
 */

// Caterer-side

/** Models with a direct `caterer_id` field (Meal, Dish, Contract, InviteCode). */
export const getCatererPermissionFilter = (caterer_id: number) => ({
	caterer_id,
});

/** Course → Meal → Caterer */
export const getCoursePermissionFilter = (caterer_id: number) => ({
	Meal: { caterer_id },
});

/** CoursePeriod → Course → Meal → Caterer */
export const getCoursePeriodPermissionFilter = (caterer_id: number) => ({
	Course: { Meal: { caterer_id } },
});

/** CourseOption → Course → Meal → Caterer */
export const getCourseOptionPermissionFilter = (caterer_id: number) => ({
	Course: { Meal: { caterer_id } },
});

/** DishPrice → Dish → Caterer */
export const getDishPricePermissionFilter = (caterer_id: number) => ({
	Dish: { caterer_id },
});

/** MealPeriod → Meal → Caterer */
export const getMealPeriodPermissionFilter = (caterer_id: number) => ({
	Meal: { caterer_id },
});

// Organisation-side

/** Models with a direct `organization_id` field (Diner, Guardian, MealPlan, Contract). */
export const getOrgPermissionFilter = (organization_id: number) => ({
	organization_id,
});

/** PlanMeal → MealPlan → Organisation */
export const getPlanMealPermissionFilter = (organization_id: number) => ({
	MealPlan: { organization_id },
});

/** PlanCourse → PlanMeal → MealPlan → Organisation */
export const getPlanCoursePermissionFilter = (organization_id: number) => ({
	PlanMeal: { MealPlan: { organization_id } },
});

/** PlanDay → MealPlan → Organisation */
export const getPlanDayPermissionFilter = (organization_id: number) => ({
	MealPlan: { organization_id },
});

/** PlanDayDiner → PlanDay → MealPlan → Organisation */
export const getPlanDayDinerPermissionFilter = (organization_id: number) => ({
	PlanDay: { MealPlan: { organization_id } },
});

/** DinerGroupMember → DinerGroup → Organisation */
export const getDinerGroupMemberPermissionFilter = (
	organization_id: number
) => ({ Group: { organization_id } });
