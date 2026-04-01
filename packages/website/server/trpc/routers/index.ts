import { router } from "../trpc";
import org from "./org";

export const appRouter = router({
	org,
});

export type AppRouter = typeof appRouter;
