import { createTRPCNuxtClient } from "trpc-nuxt/client";
import type { AppRouter } from "~~/server/trpc/routers";

export default defineNuxtPlugin((nuxtApp) => {
	const { $client } = nuxtApp as typeof nuxtApp & {
		$client: ReturnType<typeof createTRPCNuxtClient<AppRouter>>;
	};

	const isAuthorizedCookie = useCookie("caterer_authenticated") as Ref<
		string | boolean | null
	>;

	const isAuthorized = computed({
		get: () =>
			isAuthorizedCookie.value === "true" || isAuthorizedCookie.value === true,
		set: (value: boolean) => {
			isAuthorizedCookie.value = value ? "true" : null;
		},
	});

	const { data: user, refresh } = $client.catering.user.me.useQuery(undefined, {
		immediate: false,
	});

	watch(
		isAuthorized,
		(newVal) => {
			if (newVal) {
				void refresh();
			}
		},
		{ immediate: true }
	);

	const logout = async () => {
		try {
			await $client.catering.user.logout.mutate();
			await refresh();
		} catch (e) {
			console.error(e);
		}
	};

	return {
		provide: {
			catererStaff: {
				isAuthorized,
				user,
				refresh,
				logout,
			},
		},
	};
});
