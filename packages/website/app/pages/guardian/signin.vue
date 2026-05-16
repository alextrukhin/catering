<script setup lang="ts">
import { captureException } from "@sentry/nuxt";
import { TRPCClientError } from "@trpc/client";
import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import { useWebApp } from "vue-tg";

definePageMeta({
	layout: "default",
});

const router = useRouter();
const route = useRoute();
const { $guardian, $client } = useNuxtApp();
const { t } = useI18n();

watch(
	$guardian.isAuthorized,
	(value) => {
		if (value) router.replace("/guardian/dashboard");
	},
	{ immediate: true }
);

const webApp = useWebApp();
const orgId = computed(() => Number(route.query.org_id) || null);

onMounted(async () => {
	if (!webApp.initData || !orgId.value || $guardian.isAuthorized.value) return;
	try {
		await $client.guardian.user.loginWithTelegram.mutate({
			init_data_raw: webApp.initData,
			organization_id: orgId.value,
		});
		await $guardian.refresh?.();
		router.replace("/guardian/dashboard");
	} catch {
		// No linked account → show normal login
	}
});

// step: 'phone' | 'otp' | 'passkey-register'
const step = ref<"phone" | "otp" | "passkey-register">("phone");

const phone = ref("");
const otp = ref("");
const passkeyName = ref("My device");
const error = ref("");
const loadingPhone = ref(false);
const loadingOtp = ref(false);
const loadingPasskey = ref(false);

// challenge_id stored in a short-lived cookie (5 min)
const otpChallengeId = useCookie("guardian_otp_challenge", {
	maxAge: 5 * 60,
	default: () => 0,
});

const sendOtp = async () => {
	error.value = "";
	loadingPhone.value = true;
	try {
		const result = await $client.guardian.user.requestOtp.mutate({
			phone: phone.value,
		});
		otpChallengeId.value = result.challenge_id;
		step.value = "otp";
	} catch (e) {
		error.value =
			e instanceof TRPCClientError ? e.message : t("auth.failed_send_code");
		captureException(e);
	} finally {
		loadingPhone.value = false;
	}
};

const confirmOtp = async () => {
	error.value = "";
	loadingOtp.value = true;
	try {
		const result = await $client.guardian.user.verifyOtp.mutate({
			challenge_id: otpChallengeId.value,
			code: otp.value,
		});
		otpChallengeId.value = 0;
		if (!result.hasPasskey) {
			step.value = "passkey-register";
		} else {
			router.replace("/guardian/dashboard");
		}
	} catch (e) {
		error.value =
			e instanceof TRPCClientError ? e.message : t("auth.invalid_code");
		captureException(e);
	} finally {
		loadingOtp.value = false;
	}
};

const loginWithPasskey = async () => {
	error.value = "";
	loadingPasskey.value = true;
	try {
		const { options, challenge_id } =
			await $client.guardian.user.startPasskeyAuth.mutate();
		const response = await startAuthentication({ optionsJSON: options });
		await $client.guardian.user.verifyPasskeyAuth.mutate({
			challenge_id,
			response,
		});
		router.replace("/guardian/dashboard");
	} catch (e) {
		error.value =
			e instanceof TRPCClientError ? e.message : t("auth.failed_passkey_login");
		captureException(e);
	} finally {
		loadingPasskey.value = false;
	}
};

const savePasskey = async () => {
	error.value = "";
	loadingPasskey.value = true;
	try {
		const { options, challenge_id } =
			await $client.guardian.user.startPasskeyRegistration.mutate();
		const response = await startRegistration({ optionsJSON: options });
		await $client.guardian.user.verifyPasskeyRegistration.mutate({
			challenge_id,
			name: passkeyName.value,
			response,
		});
		router.replace("/guardian/dashboard");
	} catch (e) {
		error.value =
			e instanceof TRPCClientError ? e.message : t("auth.failed_save_passkey");
		captureException(e);
	} finally {
		loadingPasskey.value = false;
	}
};

const skipPasskey = () => {
	router.replace("/guardian/dashboard");
};
</script>

<template>
	<div class="flex min-h-svh items-center justify-center px-4">
		<div class="w-full max-w-sm space-y-6">
			<!-- Phone step -->
			<template v-if="step === 'phone'">
				<div class="text-center">
					<h1 class="text-2xl font-bold text-highlighted">
						{{ t("auth.phone_title") }}
					</h1>
					<p class="mt-2 text-sm text-muted">
						{{ t("auth.phone_description") }}
					</p>
				</div>

				<form class="space-y-4" @submit.prevent="sendOtp">
					<UFormField :label="t('auth.phone_label')">
						<UInput
							v-model="phone"
							type="tel"
							autocomplete="tel"
							:placeholder="t('auth.phone_placeholder')"
							size="lg"
							class="w-full"
						/>
					</UFormField>

					<p v-if="error" class="text-sm font-medium text-error">{{ error }}</p>

					<UButton
						type="submit"
						:label="t('auth.send_code')"
						block
						size="lg"
						:loading="loadingPhone"
					/>
				</form>

				<div class="relative flex items-center">
					<div class="flex-grow border-t border-default" />
					<span class="mx-3 text-xs text-muted">{{ t("auth.or") }}</span>
					<div class="flex-grow border-t border-default" />
				</div>

				<UButton
					:label="t('auth.sign_in_with_passkey')"
					icon="i-lucide-fingerprint"
					variant="outline"
					block
					size="lg"
					:loading="loadingPasskey"
					@click="loginWithPasskey"
				/>
			</template>

			<!-- OTP step -->
			<template v-else-if="step === 'otp'">
				<div class="text-center">
					<h1 class="text-2xl font-bold text-highlighted">
						{{ t("auth.otp_title") }}
					</h1>
					<p class="mt-2 text-sm text-muted">
						{{ t("auth.otp_description", { phone }) }}
					</p>
				</div>

				<form class="space-y-4" @submit.prevent="confirmOtp">
					<UFormField :label="t('auth.otp_label')">
						<UInput
							v-model="otp"
							type="text"
							inputmode="numeric"
							autocomplete="one-time-code"
							:placeholder="t('auth.otp_placeholder')"
							size="lg"
							class="w-full"
							maxlength="6"
						/>
					</UFormField>

					<p v-if="error" class="text-sm font-medium text-error">{{ error }}</p>

					<UButton
						type="submit"
						:label="t('auth.verify_button')"
						block
						size="lg"
						:loading="loadingOtp"
					/>

					<UButton
						:label="t('auth.back')"
						variant="ghost"
						block
						@click="
							step = 'phone';
							error = '';
						"
					/>
				</form>
			</template>

			<!-- Passkey registration step -->
			<template v-else-if="step === 'passkey-register'">
				<div class="text-center">
					<UIcon
						name="i-lucide-fingerprint"
						class="mx-auto mb-3 size-12 text-primary"
					/>
					<h1 class="text-2xl font-bold text-highlighted">
						{{ t("auth.passkey_title") }}
					</h1>
					<p class="mt-2 text-sm text-muted">
						{{ t("auth.passkey_description") }}
					</p>
				</div>

				<div class="space-y-4">
					<UFormField :label="t('auth.passkey_name_label')">
						<UInput
							v-model="passkeyName"
							:placeholder="t('auth.passkey_name_placeholder')"
							size="lg"
							class="w-full"
						/>
					</UFormField>

					<p v-if="error" class="text-sm font-medium text-error">{{ error }}</p>

					<UButton
						:label="t('auth.save_passkey')"
						icon="i-lucide-fingerprint"
						block
						size="lg"
						:loading="loadingPasskey"
						@click="savePasskey"
					/>

					<UButton
						:label="t('auth.skip_for_now')"
						variant="ghost"
						block
						@click="skipPasskey"
					/>
				</div>
			</template>
		</div>
	</div>
</template>
