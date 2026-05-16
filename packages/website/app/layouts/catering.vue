<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { $catererStaff } = useNuxtApp();

const { locale, t } = useI18n();
const catererName = computed(() => {
	const c = $catererStaff.user.value?.Caterer;
	if (!c) return undefined;
	return locale.value === "uk" ? c.name_uk : c.name_en;
});
const catererUser = computed(() => $catererStaff.user.value);

const open = ref(false);

const close = () => {
	open.value = false;
};

const links = computed((): NavigationMenuItem[][] => [
	[
		{
			label: t("nav.dashboard"),
			icon: "i-lucide-house",
			to: "/catering/dashboard",
			onSelect: close,
		},
		{
			label: t("nav.contracts"),
			icon: "i-lucide-file-text",
			to: "/catering/contracts",
			onSelect: close,
		},
		{
			label: t("nav.invite_codes"),
			icon: "i-lucide-ticket",
			to: "/catering/invite-codes",
			onSelect: close,
		},
		{
			label: t("nav.meals"),
			icon: "i-lucide-utensils",
			to: "/catering/meals",
			onSelect: close,
		},
		{
			label: t("nav.dishes"),
			icon: "i-lucide-chef-hat",
			to: "/catering/dishes",
			onSelect: close,
		},
		{
			label: t("nav.courses"),
			icon: "i-lucide-book-open",
			to: "/catering/courses",
			onSelect: close,
		},
		{
			label: t("nav.settings"),
			to: "/catering/settings",
			icon: "i-lucide-settings",
			defaultOpen: true,
			type: "trigger",
			children: [
				{
					label: t("nav.general"),
					to: "/catering/settings",
					exact: true,
					onSelect: close,
				},
				{
					label: t("nav.members"),
					to: "/catering/settings/members",
					onSelect: close,
				},
			],
		},
	],
]);

const groups = computed(() => [
	{
		id: "links",
		label: t("nav.go_to"),
		items: links.value.flat(),
	},
]);
</script>

<template>
	<UDashboardGroup unit="rem">
		<UDashboardSidebar
			id="default"
			v-model:open="open"
			collapsible
			resizable
			class="bg-elevated/25"
			:ui="{ footer: 'lg:border-t lg:border-default' }"
		>
			<template #header="{ collapsed }">
				<TeamsMenu :collapsed="collapsed" :name="catererName" />
			</template>

			<template #default="{ collapsed }">
				<UDashboardSearchButton
					:collapsed="collapsed"
					class="bg-transparent ring-default"
				/>

				<UNavigationMenu
					:collapsed="collapsed"
					:items="links[0]"
					orientation="vertical"
					tooltip
					popover
				/>
			</template>

			<template #footer="{ collapsed }">
				<UserMenu
					:collapsed="collapsed"
					:user="catererUser"
					logout-to="/catering/logout"
				/>
			</template>
		</UDashboardSidebar>

		<UDashboardSearch :groups="groups" />

		<slot />

		<NotificationsSlideover />
	</UDashboardGroup>
</template>
