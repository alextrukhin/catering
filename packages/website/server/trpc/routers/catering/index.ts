import { router } from "../../trpc";
import user from "./user";
import contracts from "./contracts";
import meals from "./meals";
import courses from "./courses";
import dishes from "./dishes";
import inviteCodes from "./invite-codes";

export default router({
	user,
	contracts,
	meals,
	courses,
	dishes,
	inviteCodes,
});
