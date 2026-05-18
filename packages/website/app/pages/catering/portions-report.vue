<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "catering" });

const { $client } = useNuxtApp();
const { t, locale } = useI18n();

const today = new Date();
const selectedDate = ref(
	`${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`
);

const { data, status, refresh } =
	$client.catering.portionsReport.query.useQuery(
		computed(() => ({ date: selectedDate.value }))
	);

type Row = NonNullable<typeof data.value>[number];

const columns = computed((): TableColumn<Row>[] => [
	{
		accessorKey: "org",
		header: t("ct.portions_col_org"),
	},
	{
		accessorKey: "meal",
		header: t("ct.portions_col_meal"),
	},
	{
		accessorKey: "count",
		header: t("ct.portions_col_count"),
	},
]);

const rows = computed(() =>
	(data.value ?? []).map((r) => ({
		...r,
		org: locale.value === "uk" ? r.org_name_uk : r.org_name_en || r.org_name_uk,
		meal:
			locale.value === "uk"
				? r.meal_label_uk
				: r.meal_label_en || r.meal_label_uk,
	}))
);

const total = computed(() => rows.value.reduce((s, r) => s + r.count, 0));

const totalsByMeal = computed(() => {
	const map = new Map<string, { label: string; count: number }>();
	for (const r of rows.value) {
		const existing = map.get(r.meal);
		if (existing) existing.count += r.count;
		else map.set(r.meal, { label: r.meal, count: r.count });
	}
	return Array.from(map.values()).sort((a, b) =>
		a.label.localeCompare(b.label)
	);
});
</script>

<template>
	<UDashboardPanel id="portions-report">
		<template #header>
			<UDashboardNavbar :title="t('ct.portions_report_title')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6 flex flex-col gap-6">
				<div class="flex items-end gap-4">
					<UFormField :label="t('ct.portions_date_label')">
						<UInput
							v-model="selectedDate"
							type="date"
							class="w-48"
							@change="refresh()"
						/>
					</UFormField>
					<UButton
						icon="i-lucide-refresh-cw"
						variant="outline"
						:loading="status === 'pending'"
						@click="refresh()"
					>
						{{ t("ct.portions_refresh") }}
					</UButton>
				</div>

				<UCard v-if="rows.length === 0 && status !== 'pending'">
					<div class="text-center text-muted py-8">
						{{ t("ct.portions_no_data") }}
					</div>
				</UCard>

				<template v-else>
					<UTable
						:columns="columns"
						:data="rows"
						:loading="status === 'pending'"
					>
						<template #count-cell="{ row }">
							<span class="font-semibold">{{ row.original.count }}</span>
						</template>
					</UTable>

					<div class="flex justify-end gap-3 flex-wrap">
						<UCard v-for="entry in totalsByMeal" :key="entry.label">
							<div class="inline-flex items-center gap-3">
								<span class="text-sm text-muted">{{ entry.label }}</span>
								<span class="text-xl font-bold">{{ entry.count }}</span>
							</div>
						</UCard>
						<UCard>
							<div class="inline-flex items-center gap-3">
								<span class="text-sm text-muted">
									{{ t("ct.portions_total") }}
								</span>
								<span class="text-xl font-bold">{{ total }}</span>
							</div>
						</UCard>
					</div>
				</template>
			</div>
		</template>
	</UDashboardPanel>
</template>
