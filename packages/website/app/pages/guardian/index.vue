<script setup lang="ts">
const perks = [
	{ icon: "i-lucide-layout-dashboard", key: "overview" },
	{ icon: "i-lucide-fingerprint", key: "passkey" },
	{ icon: "i-lucide-history", key: "history" },
	{ icon: "i-lucide-bell", key: "notifications" },
] as const;

const { $guardian } = useNuxtApp();
const router = useRouter();

watch(
	$guardian.isAuthorized,
	(value) => {
		if (value) router.replace("/guardian/dashboard");
	},
	{ immediate: true }
);

definePageMeta({ layout: false });
</script>

<template>
	<div>
		<NuxtLayout name="default">
			<template #header-actions>
				<UButton to="/guardian/signin" :label="$t('auth.sign_in_link')" />
			</template>

			<main class="flex-1 flex flex-col items-center px-6 py-20 gap-16">
				<div class="text-center max-w-2xl">
					<h1
						class="text-4xl font-bold tracking-tight text-highlighted sm:text-5xl"
					>
						{{ $t("landing.guardian.title") }}
					</h1>
					<p class="mt-6 text-lg text-muted">
						{{ $t("landing.guardian.subtitle") }}
					</p>
					<div class="mt-10 flex flex-col items-center gap-4">
						<UButton
							to="/guardian/signin"
							size="xl"
							:label="$t('landing.guardian.cta')"
						/>
						<p class="text-sm text-muted">
							{{ $t("landing.guardian.contact") }}
						</p>
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
							{{ $t(`landing.guardian.perks.${perk.key}`) }}
						</p>
					</div>
				</div>
			</main>
		</NuxtLayout>
	</div>
</template>
