<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "catering" });

const UBtn = resolveComponent("UButton");
const UBadgeComp = resolveComponent("UBadge");

const { $client } = useNuxtApp();
const toast = useToast();
const { t } = useI18n();

const { data: codes, refresh } = $client.catering.inviteCodes.list.useQuery();

const creating = ref(false);
const saving = ref(false);
const deleting = ref<number | null>(null);

const form = reactive({
	valid_from: new Date().toISOString().slice(0, 10),
	valid_to: "",
});

const now = new Date();

type InviteCodeRow = NonNullable<typeof codes.value>[number] & {
	contracts: number;
	status: "active" | "upcoming" | "expired";
};

const statusColor = {
	active: "success" as const,
	upcoming: "warning" as const,
	expired: "neutral" as const,
};

const columns = computed((): TableColumn<InviteCodeRow>[] => [
	{ accessorKey: "id", header: t("ct.invite_code_col_id") },
	{ accessorKey: "code", header: t("ct.invite_code_col_code") },
	{
		accessorKey: "valid_from",
		header: t("common.valid_from"),
		cell: ({ row }) => new Date(row.original.valid_from).toLocaleDateString(),
	},
	{
		accessorKey: "valid_to",
		header: t("common.valid_to"),
		cell: ({ row }) =>
			row.original.valid_to
				? new Date(row.original.valid_to).toLocaleDateString()
				: "—",
	},
	{ accessorKey: "contracts", header: t("ct.invite_code_col_contracts") },
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

const rows = computed((): InviteCodeRow[] =>
	(codes.value ?? []).map((c) => ({
		...c,
		contracts: c.Contracts.length,
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
	if (!form.valid_from) {
		toast.add({ title: t("ct.invite_code_valid_from_req"), color: "error" });
		return;
	}
	saving.value = true;
	try {
		await $client.catering.inviteCodes.create.mutate({
			valid_from: new Date(form.valid_from),
			valid_to: form.valid_to ? new Date(form.valid_to) : undefined,
		});
		toast.add({ title: t("ct.invite_code_created") });
		form.valid_from = new Date().toISOString().slice(0, 10);
		form.valid_to = "";
		creating.value = false;
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
		await $client.catering.inviteCodes.delete.mutate({ id });
		toast.add({ title: t("ct.invite_code_deleted") });
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
	<UDashboardPanel id="invite-codes">
		<template #header>
			<UDashboardNavbar :title="t('nav.invite_codes')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #trailing>
					<UButton
						icon="i-lucide-plus"
						:label="t('ct.new_invite_code')"
						class="cursor-pointer"
						@click="creating = !creating"
					/>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="flex flex-col gap-4 p-6">
				<div
					v-if="creating"
					class="flex flex-col gap-4 rounded-lg border border-default p-4"
				>
					<div class="text-sm font-medium">{{ t("ct.new_invite_code") }}</div>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<UFormField :label="t('common.valid_from')" required>
							<UInput v-model="form.valid_from" type="date" />
						</UFormField>
						<UFormField :label="t('common.valid_to')">
							<UInput v-model="form.valid_to" type="date" />
						</UFormField>
					</div>
					<div class="flex gap-2">
						<UButton
							:label="t('common.cancel')"
							color="neutral"
							variant="ghost"
							class="cursor-pointer"
							@click="creating = false"
						/>
						<UButton
							:label="t('common.create')"
							class="cursor-pointer"
							:loading="saving"
							@click="create"
						/>
					</div>
				</div>

				<UTable :data="rows" :columns="columns" />
			</div>
		</template>
	</UDashboardPanel>
</template>
