<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { $orgStaff } = useNuxtApp();

const { locale, t } = useI18n();
const orgName = computed(() => {
	const o = $orgStaff.user.value?.Organization;
	if (!o) return undefined;
	return o[`name_${locale.value}`] || o.name_uk;
});
const orgUser = computed(() => $orgStaff.user.value);

const open = ref(false);

const close = () => {
	open.value = false;
};

const links = computed((): NavigationMenuItem[][] => [
	[
		{
			label: t("nav.dashboard"),
			icon: "i-lucide-house",
			to: "/org/dashboard",
			onSelect: close,
		},
		{
			label: t("nav.diners"),
			icon: "i-lucide-users",
			to: "/org/diners",
			onSelect: close,
		},
		{
			label: t("nav.guardians"),
			icon: "i-lucide-shield-user",
			to: "/org/guardians",
			onSelect: close,
		},
		{
			label: t("nav.diner_groups"),
			icon: "i-lucide-users-round",
			to: "/org/diner-groups",
			onSelect: close,
		},
		{
			label: t("nav.contracts"),
			icon: "i-lucide-file-text",
			to: "/org/contracts",
			onSelect: close,
		},
		{
			label: t("nav.meal_plans"),
			icon: "i-lucide-calendar",
			to: "/org/meal-plans",
			onSelect: close,
		},
		{
			label: t("nav.calendar"),
			icon: "i-lucide-calendar-days",
			to: "/org/calendar",
			onSelect: close,
		},
		{
			label: t("nav.settings"),
			to: "/org/settings",
			icon: "i-lucide-settings",
			defaultOpen: true,
			type: "trigger",
			children: [
				{
					label: t("nav.general"),
					to: "/org/settings",
					exact: true,
					onSelect: close,
				},
				{
					label: t("nav.members"),
					to: "/org/settings/members",
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
				<TeamsMenu :collapsed="collapsed" :name="orgName" />
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
					:user="orgUser"
					logout-to="/org/logout"
				/>
			</template>
		</UDashboardSidebar>

		<UDashboardSearch :groups="groups" />

		<slot />

		<NotificationsSlideover />
	</UDashboardGroup>
</template>
