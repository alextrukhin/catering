<script setup lang="ts">
import { captureException } from "@sentry/nuxt";
import { TRPCClientError } from "@trpc/client";

definePageMeta({
	layout: "default",
});

const { $orgStaff } = useNuxtApp();
const route = useRoute();

watch(
	$orgStaff.isAuthorized,
	async (value) => {
		console.log("Authorization status changed:", value);
		if (value) {
			await navigateTo("/org/dashboard");
		}
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
		await $orgStaff.login({
			email: email.value,
			password: password.value,
			remember_me: rememberMe.value,
		});
		await navigateTo(
			typeof route.query.redirect === "string" ? route.query.redirect : "/org"
		);
	} catch (e) {
		loading.value = false;
		error.value =
			e instanceof TRPCClientError ? e.message : "Failed to sign in";
		captureException(e, {
			extra: { payload: { email: email.value } },
		});
	}
};
</script>

<template>
	<div class="flex min-h-svh items-center justify-center px-4">
		<div class="w-full max-w-sm space-y-6">
			<div class="text-center">
				<h1 class="text-2xl font-bold text-highlighted">
					Sign in to your account
				</h1>
				<p class="mt-2 text-sm text-muted">
					Don't have an account?
					<ULink to="/org/signup" class="text-primary font-medium">
						Sign up
					</ULink>
				</p>
			</div>

			<form class="space-y-4" @submit.prevent="submit">
				<UFormField label="Email">
					<UInput
						v-model="email"
						type="email"
						autocomplete="email"
						placeholder="you@example.com"
						size="lg"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Password">
					<UInput
						v-model="password"
						type="password"
						autocomplete="current-password"
						placeholder="••••••••"
						size="lg"
						class="w-full"
					/>
				</UFormField>

				<div class="flex items-center justify-between">
					<UCheckbox v-model="rememberMe" label="Remember me" />
				</div>

				<p v-if="error" class="text-sm font-medium text-error">
					{{ error }}
				</p>

				<UButton type="submit" label="Sign in" block size="lg" :loading />
			</form>
		</div>
	</div>
</template>
