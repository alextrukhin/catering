<script setup lang="ts">
import { captureException } from "@sentry/nuxt";
import { TRPCClientError } from "@trpc/client";

definePageMeta({
	layout: "default",
});

const router = useRouter();
const { $catererStaff, $client } = useNuxtApp();
const { t } = useI18n();

watch(
	$catererStaff.isAuthorized,
	(value) => {
		if (value) {
			router.replace("/catering/dashboard");
		}
	},
	{ immediate: true }
);

const catererName = ref("");
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
		await $client.catering.user.register.mutate({
			caterer_name: catererName.value,
			first_name: firstName.value,
			last_name: lastName.value,
			email: email.value,
			password: password.value,
			remember_me: rememberMe.value,
		});
		router.replace("/catering/dashboard");
	} catch (e) {
		loading.value = false;
		error.value =
			e instanceof TRPCClientError ? e.message : t("auth.failed_sign_up");
		captureException(e, {
			extra: {
				payload: {
					caterer_name: catererName.value,
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
				<h1 class="text-2xl font-bold text-highlighted">
					{{ t("auth.catering_sign_up_title") }}
				</h1>
				<p class="mt-2 text-sm text-muted">
					{{ t("auth.have_account") }}
					<ULink to="/catering/signin" class="text-primary font-medium">
						{{ t("auth.sign_in_link") }}
					</ULink>
				</p>
			</div>

			<form class="space-y-4" @submit.prevent="submit">
				<UFormField :label="t('auth.caterer_name')">
					<UInput
						v-model="catererName"
						autocomplete="organization"
						:placeholder="t('auth.caterer_name_placeholder')"
						size="lg"
						class="w-full"
					/>
				</UFormField>

				<div class="grid grid-cols-2 gap-4">
					<UFormField :label="t('auth.first_name')">
						<UInput
							v-model="firstName"
							autocomplete="given-name"
							:placeholder="t('auth.first_name_placeholder')"
							size="lg"
							class="w-full"
						/>
					</UFormField>

					<UFormField :label="t('auth.last_name')">
						<UInput
							v-model="lastName"
							autocomplete="family-name"
							:placeholder="t('auth.last_name_placeholder')"
							size="lg"
							class="w-full"
						/>
					</UFormField>
				</div>

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

				<UFormField :label="t('auth.password')" :hint="t('auth.password_hint')">
					<UInput
						v-model="password"
						type="password"
						autocomplete="new-password"
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
					:label="t('auth.sign_up_button')"
					block
					size="lg"
					:loading
				/>
			</form>
		</div>
	</div>
</template>
