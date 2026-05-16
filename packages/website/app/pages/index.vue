<script setup lang="ts">
const { t } = useI18n();

const portals = computed(() => [
	{
		to: "/org",
		label: t("landing.org.label"),
		description: t("landing.org.description"),
		icon: "i-heroicons-building-library",
		iconBg: "bg-blue-100 dark:bg-blue-950",
		iconColor: "text-blue-600 dark:text-blue-400",
	},
	{
		to: "/catering",
		label: t("landing.catering.label"),
		description: t("landing.catering.description"),
		icon: "i-heroicons-fire",
		iconBg: "bg-orange-100 dark:bg-orange-950",
		iconColor: "text-orange-600 dark:text-orange-400",
	},
	{
		to: "/diner",
		label: t("landing.diner.label"),
		description: t("landing.diner.description"),
		icon: "i-heroicons-face-smile",
		iconBg: "bg-green-100 dark:bg-green-950",
		iconColor: "text-green-600 dark:text-green-400",
	},
	{
		to: "/guardian",
		label: t("landing.guardian.label"),
		description: t("landing.guardian.description"),
		icon: "i-heroicons-heart",
		iconBg: "bg-purple-100 dark:bg-purple-950",
		iconColor: "text-purple-600 dark:text-purple-400",
	},
]);
</script>

<template>
	<div class="min-h-screen bg-default flex flex-col">
		<main
			class="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-16"
		>
			<div class="text-center max-w-2xl flex flex-col items-center gap-4">
				<UBadge :label="t('landing.badge')" variant="subtle" />
				<h1
					class="text-4xl sm:text-5xl font-bold tracking-tight text-highlighted"
				>
					{{ t("landing.hero_title_1") }}
					<br />
					{{ t("landing.hero_title_2") }}
				</h1>
				<p class="text-lg text-muted max-w-xl">
					{{ t("landing.hero_subtitle") }}
				</p>
			</div>

			<div
				class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-5xl"
			>
				<NuxtLink
					v-for="portal in portals"
					:key="portal.to"
					:to="portal.to"
					class="group relative rounded-2xl border border-default bg-elevated p-6 flex flex-col gap-4 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
				>
					<div
						class="size-12 rounded-xl flex items-center justify-center"
						:class="portal.iconBg"
					>
						<UIcon
							:name="portal.icon"
							class="size-6"
							:class="portal.iconColor"
						/>
					</div>
					<div class="flex flex-col gap-1 flex-1">
						<span class="font-semibold text-highlighted text-base">
							{{ portal.label }}
						</span>
						<span class="text-sm text-muted leading-snug">
							{{ portal.description }}
						</span>
					</div>
					<div
						class="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
					>
						{{ t("landing.open_portal") }}
						<UIcon name="i-heroicons-arrow-right" class="size-4" />
					</div>
				</NuxtLink>
			</div>
		</main>

		<footer
			class="border-t border-default px-6 py-5 text-center text-sm text-muted"
		>
			&copy; {{ new Date().getFullYear() }} {{ t("landing.mealplan") }}.
			{{ t("landing.all_rights_reserved") }}
		</footer>
	</div>
</template>
