<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "org" });

const UBtn = resolveComponent("UButton");

const { $client } = useNuxtApp();
const toast = useToast();
const { t } = useI18n();

const { data: guardians, refresh } = $client.org.guardians.list.useQuery();
const { data: diners } = $client.org.diners.list.useQuery();

type Guardian = NonNullable<typeof guardians.value>[number];

const open = ref(false);
const editing = ref<Guardian | null>(null);
const saving = ref(false);
const deleting = ref<number | null>(null);

const form = reactive({
	first_name: "",
	last_name: "",
	middle_name: "",
	phone: "",
	diner_ids: [] as number[],
});

const dinerOptions = computed(() =>
	(diners.value ?? []).map((d) => ({
		label: `${d.last_name} ${d.first_name}`,
		value: d.id,
	}))
);

function openCreate() {
	editing.value = null;
	Object.assign(form, {
		first_name: "",
		last_name: "",
		middle_name: "",
		phone: "",
		diner_ids: [],
	});
	open.value = true;
}

function openEdit(g: Guardian) {
	editing.value = g;
	Object.assign(form, {
		first_name: g.first_name,
		last_name: g.last_name,
		middle_name: g.middle_name ?? "",
		phone: g.phone ?? "",
		diner_ids: g.Diners.map((d) => d.Diner.id),
	});
	open.value = true;
}

async function save() {
	saving.value = true;
	try {
		if (editing.value) {
			await $client.org.guardians.update.mutate({
				id: editing.value.id,
				first_name: form.first_name || undefined,
				last_name: form.last_name || undefined,
				middle_name: form.middle_name || null,
				phone: form.phone || null,
				diner_ids: form.diner_ids,
			});
			toast.add({ title: t("op.guardian_updated") });
		} else {
			await $client.org.guardians.create.mutate({
				first_name: form.first_name,
				last_name: form.last_name,
				middle_name: form.middle_name || undefined,
				phone: form.phone || undefined,
				diner_ids: form.diner_ids,
			});
			toast.add({ title: t("op.guardian_created") });
		}
		open.value = false;
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		saving.value = false;
	}
}

async function remove(id: number) {
	deleting.value = id;
	try {
		await $client.org.guardians.delete.mutate({ id });
		toast.add({ title: t("op.guardian_removed") });
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		deleting.value = null;
	}
}

type GuardianRow = Guardian & { name: string; diners: number };

const columns = computed((): TableColumn<GuardianRow>[] => [
	{ accessorKey: "name", header: t("common.name") },
	{ accessorKey: "phone", header: t("common.phone") },
	{ accessorKey: "diners", header: t("op.col_diners") },
	{
		id: "actions",
		cell: ({ row }) =>
			h("div", { class: "flex items-center gap-2 justify-end" }, [
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-pencil",
					class: "cursor-pointer",
					onClick: () => openEdit(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					color: "error",
					icon: "i-lucide-trash-2",
					class: "cursor-pointer",
					loading: deleting.value === row.original.id,
					onClick: () => remove(row.original.id),
				}),
			]),
	},
]);

const rows = computed((): GuardianRow[] =>
	(guardians.value ?? []).map((g) => ({
		...g,
		name: `${g.last_name} ${g.first_name}${g.middle_name ? " " + g.middle_name : ""}`,
		diners: g.Diners.length,
	}))
);
</script>

<template>
	<UDashboardPanel id="guardians">
		<template #header>
			<UDashboardNavbar :title="t('nav.guardians')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton
						icon="i-lucide-plus"
						class="cursor-pointer"
						@click="openCreate"
					>
						{{ t("op.add_guardian") }}
					</UButton>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<UTable :data="rows" :columns="columns" />
			</div>
		</template>
	</UDashboardPanel>

	<USlideover
		v-model:open="open"
		:title="editing ? t('op.edit_guardian') : t('op.add_guardian')"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<div class="grid grid-cols-2 gap-4">
					<UFormField :label="t('op.first_name')" required>
						<UInput v-model="form.first_name" placeholder="Ivan" />
					</UFormField>
					<UFormField :label="t('op.last_name')" required>
						<UInput v-model="form.last_name" placeholder="Ivanenko" />
					</UFormField>
				</div>
				<UFormField :label="t('op.middle_name')">
					<UInput v-model="form.middle_name" placeholder="Ivanovych" />
				</UFormField>
				<UFormField :label="t('common.phone')">
					<UInput v-model="form.phone" placeholder="+380501234567" />
				</UFormField>
				<UFormField :label="t('op.col_diners')">
					<USelectMenu
						v-model="form.diner_ids"
						:items="dinerOptions"
						value-key="value"
						multiple
						:placeholder="t('op.select_diners')"
					/>
				</UFormField>
			</div>
		</template>
		<template #footer>
			<div class="flex gap-3 p-4">
				<UButton
					variant="ghost"
					class="flex-1 cursor-pointer"
					@click="open = false"
				>
					{{ t("common.cancel") }}
				</UButton>
				<UButton class="flex-1 cursor-pointer" :loading="saving" @click="save">
					{{ editing ? t("common.save_changes") : t("common.create") }}
				</UButton>
			</div>
		</template>
	</USlideover>
</template>
