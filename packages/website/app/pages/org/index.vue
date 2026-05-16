<script setup lang="ts">
const perks = [
	{ icon: "i-lucide-calendar", key: "meal_plans" },
	{ icon: "i-lucide-users", key: "diner_management" },
	{ icon: "i-lucide-bar-chart-2", key: "reports" },
	{ icon: "i-lucide-handshake", key: "catering" },
] as const;

const { t } = useI18n();
const { $orgStaff } = useNuxtApp();
const router = useRouter();

watch(
	$orgStaff.isAuthorized,
	(value) => {
		if (value) router.replace("/org/dashboard");
	},
	{ immediate: true }
);

definePageMeta({ layout: false });
</script>

<template>
	<div>
		<NuxtLayout name="default">
			<template #header-actions>
				<UButton
					to="/org/signin"
					variant="ghost"
					:label="t('auth.sign_in_link')"
				/>
				<UButton to="/org/signup" :label="t('auth.sign_up_link')" />
			</template>

			<main class="flex-1 flex flex-col items-center px-6 py-20 gap-16">
				<div class="text-center max-w-2xl">
					<h1
						class="text-4xl font-bold tracking-tight text-highlighted sm:text-5xl"
					>
						{{ t("landing.org.title") }}
					</h1>
					<p class="mt-6 text-lg text-muted">
						{{ t("landing.org.subtitle") }}
					</p>
					<div class="mt-10 flex items-center justify-center gap-4 flex-wrap">
						<UButton to="/org/signup" size="xl" :label="t('landing.org.cta')" />
						<UButton
							to="/org/signin"
							size="xl"
							variant="outline"
							:label="t('auth.sign_in_link')"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
					<div
						v-for="perk in perks"
						:key="perk.key"
						class="flex items-start gap-4 rounded-xl border border-default p-5 bg-elevated"
					>
						<UIcon
							:name="perk.icon"
							class="size-6 text-primary shrink-0 mt-0.5"
						/>
						<p class="text-sm text-default">
							{{ t(`landing.org.perks.${perk.key}`) }}
						</p>
					</div>
				</div>
			</main>
		</NuxtLayout>
	</div>
</template>
