import { createTRPCNuxtHandler } from "trpc-nuxt/server";
import { appRouter } from "~~/server/trpc/routers";
import type { TRPCContext } from "~~/server/trpc/trpc";
import type { H3Event } from "h3";

export default createTRPCNuxtHandler({
	router: appRouter,
	createContext: (event: H3Event): TRPCContext => ({
		event,
		orgStaff: null,
		catererStaff: null,
		diner: null,
		guardian: null,
	}),
});
