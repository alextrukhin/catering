<script setup lang="ts">
const toast = useToast();

onMounted(async () => {
	const cookie = useCookie("cookie-consent");
	if (cookie.value === "accepted") {
		return;
	}

	toast.add({
		title:
			"We use first-party cookies to enhance your experience on our website.",
		duration: 0,
		close: false,
		actions: [
			{
				label: "Accept",
				color: "neutral",
				variant: "outline",
				onClick: () => {
					cookie.value = "accepted";
				},
			},
			{
				label: "Opt out",
				color: "neutral",
				variant: "ghost",
			},
		],
	});
});
</script>

<template>
	<div class="min-h-screen bg-default flex flex-col">
		<header
			class="border-b border-default px-6 py-4 flex items-center justify-between"
		>
			<NuxtLink to="/" class="flex items-center gap-2">
				<UIcon name="i-lucide-building-2" class="size-7 text-primary" />
				<span class="text-lg font-semibold text-highlighted">
					{{ $t("landing.mealplan") }}
				</span>
			</NuxtLink>
			<div class="flex items-center gap-3">
				<UColorModeButton />
				<slot name="header-actions" />
			</div>
		</header>
		<slot />
		<NotificationsSlideover />
	</div>
</template>
