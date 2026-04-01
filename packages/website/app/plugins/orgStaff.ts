import { createTRPCNuxtClient } from "trpc-nuxt/client";
import type { AppRouter } from "~~/server/trpc/routers";

export default defineNuxtPlugin((nuxtApp) => {
	const { $client } = nuxtApp as typeof nuxtApp & {
		$client: ReturnType<typeof createTRPCNuxtClient<AppRouter>>;
	};

	const isAuthorizedCookie = useCookie("org_authenticated") as Ref<
		string | boolean | null
	>;

	const { data: user, refresh } = $client.org.user.me.useQuery(undefined, {
		lazy: true,
	});

	const isAuthorized = computed({
		get: () =>
			isAuthorizedCookie.value === "true" || isAuthorizedCookie.value === true,
		set: (value: boolean) => {
			isAuthorizedCookie.value = value ? "true" : null;
		},
	});

	const login = async (payload: {
		email: string;
		password: string;
		remember_me: boolean;
	}) => {
		await $client.org.user.login.mutate(payload);
		await refresh();
	};

	const register = async (payload: {
		first_name: string;
		last_name: string;
		email: string;
		password: string;
		remember_me?: boolean;
	}) => {
		await $client.org.user.register.mutate(payload);
		await refresh();
	};

	const logout = async () => {
		try {
			await $client.org.user.logout.mutate();
			await refresh();
		} catch (e) {
			console.error(e);
		}
	};

	return {
		provide: {
			orgStaff: {
				isAuthorized,
				user,
				login,
				register,
				logout,
			},
		},
	};
});
