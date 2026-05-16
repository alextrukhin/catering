<script setup lang="ts">
import { captureException } from "@sentry/nuxt";
import { TRPCClientError } from "@trpc/client";

definePageMeta({
	layout: "default",
});

const router = useRouter();
const { $catererStaff, $client } = useNuxtApp();
const route = useRoute();
const { t } = useI18n();

watch(
	$catererStaff.isAuthorized,
	(value) => {
		if (value) router.replace("/catering/dashboard");
	},
	{ immediate: true }
);

const email = ref("");
const password = ref("");
const rememberMe = ref(true);
const error = ref("");
const loading = ref(false);

const submit = async () => {
	error.value = "";
	loading.value = true;
	try {
		await $client.catering.user.login.mutate({
			email: email.value,
			password: password.value,
			remember_me: rememberMe.value,
		});
		router.replace(
			typeof route.query.redirect === "string"
				? route.query.redirect
				: "/catering/dashboard"
		);
	} catch (e) {
		loading.value = false;
		error.value =
			e instanceof TRPCClientError ? e.message : t("auth.failed_sign_in");
		captureException(e, { extra: { payload: { email: email.value } } });
	}
};
</script>

<template>
	<div class="flex min-h-svh items-center justify-center px-4">
		<div class="w-full max-w-sm space-y-6">
			<div class="text-center">
				<h1 class="text-2xl font-bold text-highlighted">
					{{ t("auth.sign_in_title") }}
				</h1>
				<p class="mt-2 text-sm text-muted">
					{{ t("auth.no_account") }}
					<ULink to="/catering/signup" class="text-primary font-medium">
						{{ t("auth.sign_up_link") }}
					</ULink>
				</p>
			</div>

			<form class="space-y-4" @submit.prevent="submit">
				<UFormField :label="t('auth.email')">
					<UInput
						v-model="email"
						type="email"
						autocomplete="email"
						placeholder="you@example.com"
						size="lg"
						class="w-full"
					/>
				</UFormField>

				<UFormField :label="t('auth.password')">
					<UInput
						v-model="password"
						type="password"
						autocomplete="current-password"
						:placeholder="t('auth.password_placeholder')"
						size="lg"
						class="w-full"
					/>
				</UFormField>

				<UCheckbox v-model="rememberMe" :label="t('auth.remember_me')" />

				<p v-if="error" class="text-sm font-medium text-error">
					{{ error }}
				</p>

				<UButton
					type="submit"
					:label="t('auth.sign_in_button')"
					block
					size="lg"
					:loading
				/>
			</form>
		</div>
	</div>
</template>
