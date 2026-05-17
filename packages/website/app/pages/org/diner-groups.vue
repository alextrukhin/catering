<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "org" });

const UBtn = resolveComponent("UButton");
const { $client } = useNuxtApp();
const toast = useToast();
const { t, locale } = useI18n();

const { data: groups, refresh } = $client.org.dinerGroups.list.useQuery();
const { data: diners } = $client.org.diners.list.useQuery();

type Group = NonNullable<typeof groups.value>[number];
type Member = Group["Members"][number];

const groupOpen = ref(false);
const editingGroup = ref<Group | null>(null);
const groupNameUk = ref("");
const groupNameEn = ref("");
const groupSaving = ref(false);
const groupDeleting = ref<number | null>(null);

function openCreateGroup() {
	editingGroup.value = null;
	groupNameUk.value = "";
	groupNameEn.value = "";
	groupOpen.value = true;
}

function openEditGroup(g: Group) {
	editingGroup.value = g;
	groupNameUk.value = g.name_uk;
	groupNameEn.value = g.name_en;
	groupOpen.value = true;
}

async function saveGroup() {
	if (!groupNameUk.value.trim() || !groupNameEn.value.trim()) {
		toast.add({ title: t("op.group_name_req"), color: "error" });
		return;
	}
	groupSaving.value = true;
	try {
		if (editingGroup.value) {
			await $client.org.dinerGroups.update.mutate({
				id: editingGroup.value.id,
				name_uk: groupNameUk.value,
				name_en: groupNameEn.value.trim(),
			});
			toast.add({ title: t("op.group_updated") });
		} else {
			await $client.org.dinerGroups.create.mutate({
				name_uk: groupNameUk.value,
				name_en: groupNameEn.value.trim(),
			});
			toast.add({ title: t("op.group_created") });
		}
		groupOpen.value = false;
		await refresh();
		syncActiveGroup();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		groupSaving.value = false;
	}
}

async function deleteGroup(id: number) {
	groupDeleting.value = id;
	try {
		await $client.org.dinerGroups.delete.mutate({ id });
		toast.add({ title: t("op.group_deleted") });
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		groupDeleting.value = null;
	}
}

const membersOpen = ref(false);
const activeGroup = ref<Group | null>(null);
const selectedDinerId = ref<number | undefined>(undefined);
const memberAdding = ref(false);
const memberRemoving = ref<number | null>(null);

function openManageMembers(g: Group) {
	activeGroup.value = g;
	selectedDinerId.value = undefined;
	membersOpen.value = true;
}

function syncActiveGroup() {
	if (activeGroup.value) {
		activeGroup.value =
			groups.value?.find((g) => g.id === activeGroup.value!.id) ?? null;
	}
}

async function addMember() {
	if (!selectedDinerId.value) return;
	memberAdding.value = true;
	try {
		await $client.org.dinerGroups.addMember.mutate({
			group_id: activeGroup.value!.id,
			diner_id: selectedDinerId.value,
		});
		toast.add({ title: t("op.member_added") });
		selectedDinerId.value = undefined;
		await refresh();
		syncActiveGroup();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		memberAdding.value = false;
	}
}

async function removeMember(id: number) {
	memberRemoving.value = id;
	try {
		await $client.org.dinerGroups.removeMember.mutate({ id });
		toast.add({ title: t("op.member_removed") });
		await refresh();
		syncActiveGroup();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		memberRemoving.value = null;
	}
}

const memberIds = computed(
	() => new Set(activeGroup.value?.Members.map((m) => m.diner_id) ?? [])
);

const availableDiners = computed(() =>
	(diners.value ?? [])
		.filter((d) => !memberIds.value.has(d.id))
		.map((d) => ({ label: `${d.last_name} ${d.first_name}`, value: d.id }))
);

const columns = computed((): TableColumn<Group>[] => [
	{ accessorKey: "name", header: t("op.col_group_name") },
	{
		id: "members",
		header: t("op.col_members"),
		cell: ({ row }) => h("span", {}, row.original.Members.length),
	},
	{
		id: "actions",
		cell: ({ row }) =>
			h("div", { class: "flex items-center gap-2 justify-end" }, [
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-users",
					title: "Manage members",
					class: "cursor-pointer",
					onClick: () => openManageMembers(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-pencil",
					class: "cursor-pointer",
					onClick: () => openEditGroup(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					color: "error",
					icon: "i-lucide-trash-2",
					loading: groupDeleting.value === row.original.id,
					class: "cursor-pointer",
					onClick: () => deleteGroup(row.original.id),
				}),
			]),
	},
]);
</script>

<template>
	<UDashboardPanel id="diner-groups">
		<template #header>
			<UDashboardNavbar :title="t('nav.diner_groups')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-plus" @click="openCreateGroup">
						{{ t("op.new_group") }}
					</UButton>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<UTable :data="groups ?? []" :columns="columns" />
			</div>
		</template>
	</UDashboardPanel>

	<!-- Create / edit group -->
	<USlideover
		v-model:open="groupOpen"
		:title="editingGroup ? t('op.edit_group') : t('op.new_diner_group')"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<UFormField :label="t('op.group_name_uk')" required>
					<UInput v-model="groupNameUk" placeholder="e.g. Клас 1А" />
				</UFormField>
				<UFormField :label="t('op.group_name_en')" required>
					<UInput v-model="groupNameEn" placeholder="e.g. Class 1A" />
				</UFormField>
			</div>
		</template>
		<template #footer>
			<div class="flex gap-3 p-4">
				<UButton variant="ghost" class="flex-1" @click="groupOpen = false">
					{{ t("common.cancel") }}
				</UButton>
				<UButton class="flex-1" :loading="groupSaving" @click="saveGroup">
					{{ editingGroup ? t("common.save_changes") : t("common.create") }}
				</UButton>
			</div>
		</template>
	</USlideover>

	<!-- Manage members -->
	<USlideover
		v-model:open="membersOpen"
		:title="`Members — ${activeGroup?.[`name_${locale}`] || activeGroup?.name_uk || ''}`"
		side="right"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<!-- Add member -->
				<div class="flex gap-2 items-end">
					<UFormField :label="t('op.add_diner_to_group')" class="flex-1">
						<USelect
							v-model="selectedDinerId"
							:items="availableDiners"
							value-key="value"
							option-attribute="label"
							:placeholder="t('op.select_diner_ph')"
						/>
					</UFormField>
					<UButton
						:loading="memberAdding"
						:disabled="!selectedDinerId"
						@click="addMember"
					>
						{{ t("common.add") }}
					</UButton>
				</div>

				<!-- Current members -->
				<div>
					<div class="font-medium text-sm mb-3">
						{{ t("op.current_members") }}
					</div>
					<div v-if="activeGroup?.Members.length" class="flex flex-col gap-2">
						<div
							v-for="m in activeGroup.Members"
							:key="m.id"
							class="flex items-center justify-between rounded-lg border border-default px-3 py-2"
						>
							<div>
								<span class="text-sm font-medium">
									{{ m.Diner.last_name }} {{ m.Diner.first_name }}
								</span>
								<span class="text-xs text-muted ml-2">{{ m.Diner.phone }}</span>
							</div>
							<UButton
								size="xs"
								variant="ghost"
								color="error"
								icon="i-lucide-x"
								:loading="memberRemoving === m.id"
								class="cursor-pointer"
								@click="removeMember(m.id)"
							/>
						</div>
					</div>
					<div v-else class="text-muted text-sm">{{ t("op.no_members") }}</div>
				</div>
			</div>
		</template>
	</USlideover>
</template>
