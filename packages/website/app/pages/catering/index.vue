<script setup lang="ts">
const perks = [
	{ icon: "i-lucide-utensils", key: "menus" },
	{ icon: "i-lucide-clipboard-list", key: "orders" },
	{ icon: "i-lucide-tag", key: "pricing" },
	{ icon: "i-lucide-file-text", key: "clients" },
] as const;

const { $catererStaff } = useNuxtApp();
const router = useRouter();

watch(
	$catererStaff.isAuthorized,
	(value) => {
		if (value) router.replace("/catering/dashboard");
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
					to="/catering/signin"
					variant="ghost"
					:label="$t('auth.sign_in_link')"
				/>
				<UButton to="/catering/signup" :label="$t('auth.sign_up_link')" />
			</template>

			<main class="flex-1 flex flex-col items-center px-6 py-20 gap-16">
				<div class="text-center max-w-2xl">
					<h1
						class="text-4xl font-bold tracking-tight text-highlighted sm:text-5xl"
					>
						{{ $t("landing.catering.title") }}
					</h1>
					<p class="mt-6 text-lg text-muted">
						{{ $t("landing.catering.subtitle") }}
					</p>
					<div class="mt-10 flex items-center justify-center gap-4 flex-wrap">
						<UButton
							to="/catering/signup"
							size="xl"
							:label="$t('landing.catering.cta')"
						/>
						<UButton
							to="/catering/signin"
							size="xl"
							variant="outline"
							:label="$t('auth.sign_in_link')"
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
							{{ $t(`landing.catering.perks.${perk.key}`) }}
						</p>
					</div>
				</div>
			</main>
		</NuxtLayout>
	</div>
</template>
