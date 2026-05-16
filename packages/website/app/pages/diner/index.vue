<script setup lang="ts">
definePageMeta({ layout: false });

const { $diner } = useNuxtApp();
const router = useRouter();

watch(
	$diner.isAuthorized,
	(value) => {
		if (value) router.replace("/diner/dashboard");
	},
	{ immediate: true }
);

const perks = [
	{ icon: "i-lucide-utensils", key: "select" },
	{ icon: "i-lucide-fingerprint", key: "passkey" },
	{ icon: "i-lucide-users", key: "guardian" },
	{ icon: "i-lucide-bell", key: "notifications" },
] as const;
</script>

<template>
	<div>
		<NuxtLayout name="default">
			<template #header-actions>
				<UButton to="/diner/signin" :label="$t('auth.sign_in_link')" />
			</template>

			<main class="flex-1 flex flex-col items-center px-6 py-20 gap-16">
				<div class="text-center max-w-2xl">
					<h1
						class="text-4xl font-bold tracking-tight text-highlighted sm:text-5xl"
					>
						{{ $t("landing.diner.title") }}
					</h1>
					<p class="mt-6 text-lg text-muted">
						{{ $t("landing.diner.subtitle") }}
					</p>
					<div class="mt-10 flex flex-col items-center gap-4">
						<UButton
							to="/diner/signin"
							size="xl"
							:label="$t('landing.diner.cta')"
						/>
						<p class="text-sm text-muted">
							{{ $t("landing.diner.contact") }}
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
							{{ $t(`landing.diner.perks.${perk.key}`) }}
						</p>
					</div>
				</div>
			</main>
		</NuxtLayout>
	</div>
</template>
