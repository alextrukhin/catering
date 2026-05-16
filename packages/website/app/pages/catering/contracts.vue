<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "catering" });

const UBtn = resolveComponent("UButton");
const UBadgeComp = resolveComponent("UBadge");

const { $client } = useNuxtApp();
const toast = useToast();
const { t } = useI18n();

const { data: contracts, refresh } = $client.catering.contracts.list.useQuery();

type Contract = NonNullable<typeof contracts.value>[number];

const open = ref(false);
const editing = ref<Contract | null>(null);
const saving = ref(false);
const deleting = ref<number | null>(null);

const form = reactive({
	organization_id: "",
	valid_from: "",
	valid_to: "",
	invite_code_id: "",
});

function openCreate() {
	editing.value = null;
	Object.assign(form, {
		organization_id: "",
		valid_from: "",
		valid_to: "",
		invite_code_id: "",
	});
	open.value = true;
}

function openEdit(c: Contract) {
	editing.value = c;
	Object.assign(form, {
		organization_id: String(c.organization_id),
		valid_from: c.valid_from
			? new Date(c.valid_from).toISOString().slice(0, 10)
			: "",
		valid_to: c.valid_to ? new Date(c.valid_to).toISOString().slice(0, 10) : "",
		invite_code_id: c.invite_code_id != null ? String(c.invite_code_id) : "",
	});
	open.value = true;
}

async function save() {
	saving.value = true;
	try {
		const orgId = Number(form.organization_id);
		const codeId = form.invite_code_id
			? Number(form.invite_code_id)
			: undefined;

		if (editing.value) {
			await $client.catering.contracts.update.mutate({
				id: editing.value.id,
				valid_from: form.valid_from ? new Date(form.valid_from) : undefined,
				valid_to: form.valid_to ? new Date(form.valid_to) : null,
				invite_code_id: codeId ?? null,
			});
			toast.add({ title: t("ct.contract_updated") });
		} else {
			if (!orgId || !form.valid_from) {
				toast.add({
					title: t("ct.contract_org_required"),
					color: "error",
				});
				return;
			}
			await $client.catering.contracts.create.mutate({
				organization_id: orgId,
				valid_from: new Date(form.valid_from),
				valid_to: form.valid_to ? new Date(form.valid_to) : undefined,
				invite_code_id: codeId,
			});
			toast.add({ title: t("ct.contract_created") });
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
		await $client.catering.contracts.delete.mutate({ id });
		toast.add({ title: t("ct.contract_deleted") });
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

const now = new Date();

type ContractRow = Contract & {
	org: string;
	invite_code: string;
	status: "active" | "upcoming" | "expired";
};

const statusColor = {
	active: "success" as const,
	upcoming: "warning" as const,
	expired: "neutral" as const,
};

const columns = computed((): TableColumn<ContractRow>[] => [
	{ accessorKey: "org", header: t("ct.contract_org") },
	{
		accessorKey: "valid_from",
		header: t("common.from"),
		cell: ({ row }) => new Date(row.original.valid_from).toLocaleDateString(),
	},
	{
		accessorKey: "valid_to",
		header: t("common.to"),
		cell: ({ row }) =>
			row.original.valid_to
				? new Date(row.original.valid_to).toLocaleDateString()
				: "—",
	},
	{ accessorKey: "invite_code", header: t("ct.contract_invite_code") },
	{
		id: "status",
		header: t("common.status"),
		cell: ({ row }) =>
			h(
				UBadgeComp,
				{ color: statusColor[row.original.status], variant: "subtle" },
				() => t(`common.status_${row.original.status}`)
			),
	},
	{
		id: "actions",
		cell: ({ row }) =>
			h("div", { class: "flex items-center gap-2 justify-end" }, [
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-pencil",
					onClick: () => openEdit(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					color: "error",
					icon: "i-lucide-trash-2",
					loading: deleting.value === row.original.id,
					onClick: () => remove(row.original.id),
				}),
			]),
	},
]);

const rows = computed((): ContractRow[] =>
	(contracts.value ?? []).map((c) => ({
		...c,
		org: c.Organization.name,
		invite_code: c.InviteCode ? `#${c.InviteCode.id}` : "—",
		status:
			new Date(c.valid_from) <= now &&
			(!c.valid_to || new Date(c.valid_to) >= now)
				? "active"
				: new Date(c.valid_from) > now
					? "upcoming"
					: "expired",
	}))
);
</script>

<template>
	<UDashboardPanel id="contracts">
		<template #header>
			<UDashboardNavbar :title="t('nav.contracts')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-plus" @click="openCreate">
						{{ t("ct.new_contract") }}
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
		:title="editing ? t('ct.edit_contract') : t('ct.new_contract')"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<UFormField :label="t('ct.contract_org_id')" required>
					<UInput
						v-model="form.organization_id"
						type="number"
						:placeholder="t('ct.contract_enter_org_id')"
						:disabled="!!editing"
					/>
				</UFormField>
				<UFormField :label="t('common.valid_from')" required>
					<UInput v-model="form.valid_from" type="date" />
				</UFormField>
				<UFormField :label="t('common.valid_to')">
					<UInput v-model="form.valid_to" type="date" />
				</UFormField>
				<UFormField :label="t('ct.contract_invite_code_id')">
					<UInput
						v-model="form.invite_code_id"
						type="number"
						:placeholder="t('ct.contract_optional')"
					/>
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
