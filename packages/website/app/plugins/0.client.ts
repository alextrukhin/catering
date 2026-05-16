import {
	createTRPCNuxtClient,
	httpBatchLink,
	httpLink,
} from "trpc-nuxt/client";
import { splitLink, isNonJsonSerializable } from "@trpc/client";
import type { AppRouter } from "~~/server/trpc/routers";

const url = "/api/trpc";

export default defineNuxtPlugin(() => {
	const client = createTRPCNuxtClient<AppRouter>({
		links: [
			splitLink({
				condition: (op) => isNonJsonSerializable(op.input),
				true: httpLink({
					url,
				}),
				false: httpBatchLink({
					url,
				}),
			}),
		],
	});

	return {
		provide: {
			client,
		},
	};
});
