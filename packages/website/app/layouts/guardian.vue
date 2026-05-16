<script setup lang="ts">
const { $guardian } = useNuxtApp();
const { t, locale, setLocale } = useI18n();

const guardianName = computed(() => {
	const u = $guardian.user.value;
	return u ? `${u.first_name} ${u.last_name}` : undefined;
});

function toggleLang() {
	setLocale(locale.value === "uk" ? "en" : "uk");
}
</script>

<template>
	<div class="min-h-screen flex flex-col bg-background">
		<header
			class="sticky top-0 z-20 border-b border-default bg-background/80 backdrop-blur-sm"
		>
			<div
				class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between"
			>
				<div class="flex items-center gap-2">
					<UIcon name="i-lucide-users" class="size-5 text-primary" />
					<span class="font-semibold text-highlighted">
						{{ t("dashboard.meal_plan") }}
					</span>
				</div>
				<div class="flex items-center gap-3">
					<span v-if="guardianName" class="text-sm text-muted hidden sm:block">
						{{ guardianName }}
					</span>
					<UButton
						variant="ghost"
						size="sm"
						:label="locale === 'uk' ? 'EN' : 'UK'"
						@click="toggleLang"
					/>
					<UColorModeButton />
					<UButton
						to="/guardian/settings"
						variant="ghost"
						size="sm"
						icon="i-lucide-settings"
					/>
					<UButton
						to="/guardian/logout"
						variant="ghost"
						size="sm"
						icon="i-lucide-log-out"
						:label="t('dashboard.log_out')"
					/>
				</div>
			</div>
		</header>

		<main class="flex-1">
			<slot />
		</main>
	</div>
</template>
