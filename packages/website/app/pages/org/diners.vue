<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "org" });

const UBtn = resolveComponent("UButton");

const { $client } = useNuxtApp();
const toast = useToast();
const { t } = useI18n();

const { data: diners, refresh } = $client.org.diners.list.useQuery();

type Diner = NonNullable<typeof diners.value>[number];

// Slideover state
const open = ref(false);
const editing = ref<Diner | null>(null);
const saving = ref(false);
const deleting = ref<number | null>(null);

const form = reactive({
	first_name: "",
	last_name: "",
	middle_name: "",
	phone: "",
});

function openCreate() {
	editing.value = null;
	Object.assign(form, {
		first_name: "",
		last_name: "",
		middle_name: "",
		phone: "",
	});
	open.value = true;
}

function openEdit(diner: Diner) {
	editing.value = diner;
	Object.assign(form, {
		first_name: diner.first_name,
		last_name: diner.last_name,
		middle_name: diner.middle_name ?? "",
		phone: diner.phone ?? "",
	});
	open.value = true;
}

async function save() {
	saving.value = true;
	try {
		if (editing.value) {
			await $client.org.diners.update.mutate({
				id: editing.value.id,
				first_name: form.first_name || undefined,
				last_name: form.last_name || undefined,
				middle_name: form.middle_name || null,
				phone: form.phone || null,
			});
			toast.add({ title: t("op.diner_updated") });
		} else {
			await $client.org.diners.create.mutate({
				first_name: form.first_name,
				last_name: form.last_name,
				middle_name: form.middle_name || undefined,
				phone: form.phone || undefined,
			});
			toast.add({ title: t("op.diner_created") });
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
		await $client.org.diners.delete.mutate({ id });
		toast.add({ title: t("op.diner_removed") });
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

type DinerRow = Diner & { name: string; guardians: number };

const columns = computed((): TableColumn<DinerRow>[] => [
	{ accessorKey: "name", header: t("common.name") },
	{ accessorKey: "phone", header: t("common.phone") },
	{ accessorKey: "guardians", header: t("op.col_guardians") },
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

const rows = computed((): DinerRow[] =>
	(diners.value ?? []).map((d) => ({
		...d,
		name: `${d.last_name} ${d.first_name}${d.middle_name ? " " + d.middle_name : ""}`,
		guardians: d.Guardians.length,
	}))
);
</script>

<template>
	<UDashboardPanel id="diners">
		<template #header>
			<UDashboardNavbar :title="t('nav.diners')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton
						icon="i-lucide-plus"
						class="cursor-pointer"
						@click="openCreate"
					>
						{{ t("op.add_diner") }}
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
		:title="editing ? t('op.edit_diner') : t('op.add_diner')"
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
			</div>
		</template>
		<template #footer>
			<div class="flex gap-3 p-4">
				<UButton variant="ghost" class="flex-1" @click="open = false">
					{{ t("common.cancel") }}
				</UButton>
				<UButton class="flex-1" :loading="saving" @click="save">
					{{ editing ? t("common.save_changes") : t("common.create") }}
				</UButton>
			</div>
		</template>
	</USlideover>
</template>
