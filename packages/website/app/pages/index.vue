<template>
	<div class="min-h-screen bg-[var(--ui-bg)] flex flex-col">
		<header
			class="border-b border-[var(--ui-border)] px-6 py-4 flex items-center justify-between"
		>
			<div class="flex items-center gap-2">
				<UIcon
					name="i-heroicons-building-office-2"
					class="size-7 text-primary"
				/>
				<span class="text-lg font-semibold text-[var(--ui-text-highlighted)]">
					MealPlan
				</span>
			</div>
			<UColorModeButton />
		</header>

		<main
			class="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-16"
		>
			<div class="text-center max-w-2xl flex flex-col items-center gap-4">
				<UBadge label="School Catering Management" variant="subtle" />
				<h1
					class="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--ui-text-highlighted)]"
				>
					One platform,
					<br />
					every role covered
				</h1>
				<p class="text-lg text-[var(--ui-text-muted)] max-w-xl">
					Manage school catering operations, meal plans, and student nutrition —
					all in one place.
				</p>
			</div>

			<div
				class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-5xl"
			>
				<NuxtLink
					v-for="portal in portals"
					:key="portal.to"
					:to="portal.to"
					class="group relative rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-6 flex flex-col gap-4 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer"
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
						<span
							class="font-semibold text-[var(--ui-text-highlighted)] text-base"
						>
							{{ portal.label }}
						</span>
						<span class="text-sm text-[var(--ui-text-muted)] leading-snug">
							{{ portal.description }}
						</span>
					</div>
					<div
						class="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
					>
						Open portal
						<UIcon name="i-heroicons-arrow-right" class="size-4" />
					</div>
				</NuxtLink>
			</div>
		</main>

		<footer
			class="border-t border-[var(--ui-border)] px-6 py-5 text-center text-sm text-[var(--ui-text-muted)]"
		>
			&copy; {{ new Date().getFullYear() }} MealPlan. All rights reserved.
		</footer>
	</div>
</template>

<script setup lang="ts">
const portals = [
	{
		to: "/org",
		label: "Organization",
		description: "Manage schools, staff, and overall system configuration.",
		icon: "i-heroicons-building-library",
		iconBg: "bg-blue-100 dark:bg-blue-950",
		iconColor: "text-blue-600 dark:text-blue-400",
	},
	{
		to: "/catering",
		label: "Catering",
		description: "Plan menus, track orders, and oversee meal preparation.",
		icon: "i-heroicons-fire",
		iconBg: "bg-orange-100 dark:bg-orange-950",
		iconColor: "text-orange-600 dark:text-orange-400",
	},
	{
		to: "/diner",
		label: "Diner",
		description: "Browse meal plans, select dishes, and manage your account.",
		icon: "i-heroicons-face-smile",
		iconBg: "bg-green-100 dark:bg-green-950",
		iconColor: "text-green-600 dark:text-green-400",
	},
	{
		to: "/guardian",
		label: "Guardian",
		description: "Monitor children's meals, nutrition, and payment history.",
		icon: "i-heroicons-heart",
		iconBg: "bg-purple-100 dark:bg-purple-950",
		iconColor: "text-purple-600 dark:text-purple-400",
	},
];
</script>
