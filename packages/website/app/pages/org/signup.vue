<script setup lang="ts">
import { captureException } from "@sentry/nuxt";
import { TRPCClientError } from "@trpc/client";

definePageMeta({
	layout: "default",
});

const { $orgStaff } = useNuxtApp();

watch(
	$orgStaff.isAuthorized,
	async (value) => {
		if (value) {
			await navigateTo("/org/dashboard");
		}
	},
	{ immediate: true }
);

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const rememberMe = ref(true);
const error = ref("");
const loading = ref(false);

const submit = async () => {
	error.value = "";
	loading.value = true;
	try {
		await $orgStaff.register({
			first_name: firstName.value,
			last_name: lastName.value,
			email: email.value,
			password: password.value,
			remember_me: rememberMe.value,
		});
		await navigateTo("/org");
	} catch (e) {
		loading.value = false;
		error.value =
			e instanceof TRPCClientError ? e.message : "Failed to sign up";
		captureException(e, {
			extra: {
				payload: {
					first_name: firstName.value,
					last_name: lastName.value,
					email: email.value,
				},
			},
		});
	}
};
</script>

<template>
	<div class="flex min-h-svh items-center justify-center px-4">
		<div class="w-full max-w-sm space-y-6">
			<div class="text-center">
				<h1 class="text-2xl font-bold text-highlighted">Create your account</h1>
				<p class="mt-2 text-sm text-muted">
					Already have an account?
					<ULink to="/org/signin" class="text-primary font-medium">
						Sign in
					</ULink>
				</p>
			</div>

			<form class="space-y-4" @submit.prevent="submit">
				<div class="grid grid-cols-2 gap-4">
					<UFormField label="First name">
						<UInput
							v-model="firstName"
							autocomplete="given-name"
							placeholder="John"
							size="lg"
							class="w-full"
						/>
					</UFormField>

					<UFormField label="Last name">
						<UInput
							v-model="lastName"
							autocomplete="family-name"
							placeholder="Doe"
							size="lg"
							class="w-full"
						/>
					</UFormField>
				</div>

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

				<UFormField label="Password" hint="Min. 8 characters">
					<UInput
						v-model="password"
						type="password"
						autocomplete="new-password"
						placeholder="••••••••"
						size="lg"
						class="w-full"
					/>
				</UFormField>

				<UCheckbox v-model="rememberMe" label="Remember me" />

				<p v-if="error" class="text-sm font-medium text-error">
					{{ error }}
				</p>

				<UButton type="submit" label="Sign up" block size="lg" :loading />
			</form>
		</div>
	</div>
</template>
