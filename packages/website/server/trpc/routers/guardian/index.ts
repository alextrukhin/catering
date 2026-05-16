import { router } from "../../trpc";
import user from "./user";
import diners from "./diners";

export default router({
	user,
	diners,
});
