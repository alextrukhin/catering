import { router } from "../trpc";
import user from "./user";
import users from "./users";

export const appRouter = router({
	user,
	users,
});

export type AppRouter = typeof appRouter;
