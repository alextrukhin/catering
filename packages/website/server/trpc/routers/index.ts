import { router } from "../trpc";
import org from "./org";
import catering from "./catering";
import guardian from "./guardian";
import diner from "./diner";

export const appRouter = router({
	org,
	catering,
	guardian,
	diner,
});

export type AppRouter = typeof appRouter;
