<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "org" });

const UBtn = resolveComponent("UButton");
const UBadgeComp = resolveComponent("UBadge");

const { $client } = useNuxtApp();
const toast = useToast();
const { t } = useI18n();

const { data: contracts, refresh } = $client.org.contracts.list.useQuery();

const showSlideover = ref(false);
const saving = ref(false);
const deleting = ref<number | null>(null);

const form = reactive({
	invite_code: "",
	valid_from: new Date().toISOString().slice(0, 10),
	valid_to: "",
});

const now = new Date();

type ContractRow = NonNullable<typeof contracts.value>[number] & {
	caterer_name: string;
	invite_code: string;
	status: "active" | "upcoming" | "expired";
};

const statusColor = {
	active: "success" as const,
	upcoming: "warning" as const,
	expired: "neutral" as const,
};

const columns = computed((): TableColumn<ContractRow>[] => [
	{ accessorKey: "caterer_name", header: t("op.caterer") },
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
				() => t("common.status_" + row.original.status)
			),
	},
	{
		id: "actions",
		header: "",
		cell: ({ row }) =>
			h(UBtn, {
				icon: "i-lucide-trash",
				color: "error",
				variant: "ghost",
				size: "sm",
				class: "cursor-pointer",
				loading: deleting.value === row.original.id,
				onClick: () => remove(row.original.id),
			}),
	},
]);

const rows = computed((): ContractRow[] =>
	(contracts.value ?? []).map((c) => ({
		...c,
		caterer_name: c.Caterer.name_uk,
		invite_code: c.InviteCode ? c.InviteCode.code : "—",
		status:
			new Date(c.valid_from) <= now &&
			(!c.valid_to || new Date(c.valid_to) >= now)
				? "active"
				: new Date(c.valid_from) > now
					? "upcoming"
					: "expired",
	}))
);

async function create() {
	if (!form.invite_code) {
		toast.add({ title: t("op.invite_code_req"), color: "error" });
		return;
	}
	saving.value = true;
	try {
		await $client.org.contracts.create.mutate({
			invite_code: form.invite_code,
			valid_from: new Date(form.valid_from),
			valid_to: form.valid_to ? new Date(form.valid_to) : undefined,
		});
		toast.add({ title: t("op.contract_created") });
		form.invite_code = "";
		form.valid_to = "";
		showSlideover.value = false;
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
		await $client.org.contracts.delete.mutate({ id });
		toast.add({ title: t("op.contract_deleted") });
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
</script>

<template>
	<UDashboardPanel id="contracts">
		<template #header>
			<UDashboardNavbar :title="t('nav.contracts')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #trailing>
					<UButton
						icon="i-lucide-plus"
						:label="t('op.new_contract')"
						class="cursor-pointer"
						@click="showSlideover = true"
					/>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<UTable :data="rows" :columns="columns" />
			</div>
		</template>
	</UDashboardPanel>

	<USlideover v-model:open="showSlideover" :title="t('op.new_contract')">
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<UFormField :label="t('ct.contract_invite_code')" required>
					<UInput
						v-model="form.invite_code"
						type="text"
						placeholder="Enter invite code (e.g. ABCD123456)"
					/>
				</UFormField>
				<UFormField :label="t('common.valid_from')" required>
					<UInput v-model="form.valid_from" type="date" />
				</UFormField>
				<UFormField :label="t('common.valid_to')">
					<UInput v-model="form.valid_to" type="date" />
				</UFormField>
			</div>
		</template>
		<template #footer>
			<div class="flex gap-2 p-4">
				<UButton
					:label="t('common.cancel')"
					color="neutral"
					variant="ghost"
					class="cursor-pointer"
					@click="showSlideover = false"
				/>
				<UButton
					:label="t('common.create')"
					class="cursor-pointer"
					:loading="saving"
					@click="create"
				/>
			</div>
		</template>
	</USlideover>
</template>
