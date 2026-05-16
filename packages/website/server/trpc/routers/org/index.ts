import { router } from "../../trpc";
import user from "./user";
import contracts from "./contracts";
import diners from "./diners";
import guardians from "./guardians";
import mealPlans from "./meal-plans";
import dinerGroups from "./diner-groups";
import settings from "./settings";

export default router({
	user,
	contracts,
	diners,
	guardians,
	mealPlans,
	dinerGroups,
	settings,
});
