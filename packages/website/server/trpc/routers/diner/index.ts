import { router } from "../../trpc";
import user from "./user";
import selections from "./selections";

export default router({
	user,
	selections,
});
