<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "catering" });

const UBtn = resolveComponent("UButton");

const { $client } = useNuxtApp();
const toast = useToast();
const { t } = useI18n();

const { data: meals, refresh } = $client.catering.meals.list.useQuery();

type Meal = NonNullable<typeof meals.value>[number];
type Period = Meal["Periods"][number];

// Meal slideover
const mealOpen = ref(false);
const editingMeal = ref<Meal | null>(null);
const mealLabelUk = ref("");
const mealLabelEn = ref("");
const mealSaving = ref(false);
const mealDeleting = ref<number | null>(null);

// Period slideover
const periodOpen = ref(false);
const activeMeal = ref<Meal | null>(null);
const editingPeriod = ref<Period | null>(null);
const periodForm = reactive({ valid_from: "", valid_to: "" });
const periodSaving = ref(false);
const periodDeleting = ref<number | null>(null);

function openCreateMeal() {
	editingMeal.value = null;
	mealLabelUk.value = "";
	mealLabelEn.value = "";
	mealOpen.value = true;
}

function openEditMeal(m: Meal) {
	editingMeal.value = m;
	mealLabelUk.value = m.label_uk;
	mealLabelEn.value = m.label_en;
	mealOpen.value = true;
}

async function saveMeal() {
	mealSaving.value = true;
	try {
		if (editingMeal.value) {
			await $client.catering.meals.update.mutate({
				id: editingMeal.value.id,
				label_uk: mealLabelUk.value,
				label_en: mealLabelEn.value,
			});
			toast.add({ title: t("ct.meal_updated") });
		} else {
			await $client.catering.meals.create.mutate({
				label_uk: mealLabelUk.value,
				label_en: mealLabelEn.value,
			});
			toast.add({ title: t("ct.meal_created") });
		}
		mealOpen.value = false;
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		mealSaving.value = false;
	}
}

async function deleteMeal(id: number) {
	mealDeleting.value = id;
	try {
		await $client.catering.meals.delete.mutate({ id });
		toast.add({ title: t("ct.meal_deleted") });
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		mealDeleting.value = null;
	}
}

function openPeriods(m: Meal) {
	activeMeal.value = m;
	editingPeriod.value = null;
	Object.assign(periodForm, { valid_from: "", valid_to: "" });
	periodOpen.value = true;
}

function editPeriod(p: Period) {
	editingPeriod.value = p;
	periodForm.valid_from = p.valid_from
		? new Date(p.valid_from).toISOString().slice(0, 10)
		: "";
	periodForm.valid_to = p.valid_to
		? new Date(p.valid_to).toISOString().slice(0, 10)
		: "";
}

async function savePeriod() {
	periodSaving.value = true;
	try {
		if (editingPeriod.value) {
			await $client.catering.meals.updatePeriod.mutate({
				id: editingPeriod.value.id,
				valid_from: periodForm.valid_from
					? new Date(periodForm.valid_from)
					: undefined,
				valid_to: periodForm.valid_to ? new Date(periodForm.valid_to) : null,
			});
			toast.add({ title: t("ct.period_updated") });
		} else {
			if (!periodForm.valid_from) {
				toast.add({ title: t("common.start_date_required"), color: "error" });
				return;
			}
			await $client.catering.meals.addPeriod.mutate({
				meal_id: activeMeal.value!.id,
				valid_from: new Date(periodForm.valid_from),
				valid_to: periodForm.valid_to ? new Date(periodForm.valid_to) : null,
			});
			toast.add({ title: t("ct.period_added") });
		}
		editingPeriod.value = null;
		Object.assign(periodForm, { valid_from: "", valid_to: "" });
		await refresh();
		// Update local activeMeal
		activeMeal.value =
			meals.value?.find((m) => m.id === activeMeal.value?.id) ?? null;
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		periodSaving.value = false;
	}
}

async function deletePeriod(id: number) {
	periodDeleting.value = id;
	try {
		await $client.catering.meals.removePeriod.mutate({ id });
		toast.add({ title: t("ct.period_removed") });
		await refresh();
		activeMeal.value =
			meals.value?.find((m) => m.id === activeMeal.value?.id) ?? null;
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		periodDeleting.value = null;
	}
}

type MealRow = Meal & { courses: number; periods: number };

const columns = computed((): TableColumn<MealRow>[] => [
	{ accessorKey: "label_uk", header: t("ct.meal_col") },
	{ accessorKey: "courses", header: t("nav.courses") },
	{
		accessorKey: "periods",
		header: t("common.date_ranges"),
		cell: ({ row }) =>
			h("div", { class: "flex items-center gap-2" }, [
				h("span", {}, String(row.original.periods)),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-calendar",
					onClick: () => openPeriods(row.original),
				}),
			]),
	},
	{
		id: "actions",
		cell: ({ row }) =>
			h("div", { class: "flex items-center gap-2 justify-end" }, [
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-pencil",
					onClick: () => openEditMeal(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					color: "error",
					icon: "i-lucide-trash-2",
					loading: mealDeleting.value === row.original.id,
					onClick: () => deleteMeal(row.original.id),
				}),
			]),
	},
]);

const rows = computed((): MealRow[] =>
	(meals.value ?? []).map((m) => ({
		...m,
		courses: m.Courses.length,
		periods: m.Periods.length,
	}))
);
</script>

<template>
	<UDashboardPanel id="meals">
		<template #header>
			<UDashboardNavbar :title="t('nav.meals')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-plus" @click="openCreateMeal">
						{{ t("ct.new_meal") }}
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

	<!-- Meal create/edit slideover -->
	<USlideover
		v-model:open="mealOpen"
		:title="editingMeal ? t('ct.edit_meal') : t('ct.new_meal')"
	>
		<template #body>
			<div class="p-4 flex flex-col gap-4">
				<UFormField :label="t('common.label_uk')" required>
					<UInput v-model="mealLabelUk" placeholder="e.g. Обід" />
				</UFormField>
				<UFormField :label="t('common.label_en')" required>
					<UInput v-model="mealLabelEn" placeholder="e.g. Lunch" />
				</UFormField>
			</div>
		</template>
		<template #footer>
			<div class="flex gap-3 p-4">
				<UButton variant="ghost" class="flex-1" @click="mealOpen = false">
					{{ t("common.cancel") }}
				</UButton>
				<UButton class="flex-1" :loading="mealSaving" @click="saveMeal">
					{{ editingMeal ? t("common.save_changes") : t("common.create") }}
				</UButton>
			</div>
		</template>
	</USlideover>

	<!-- Periods slideover -->
	<USlideover
		v-model:open="periodOpen"
		:title="`Periods — ${activeMeal?.label_uk}`"
		side="right"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<!-- Existing periods -->
				<div v-if="activeMeal?.Periods.length" class="flex flex-col gap-2">
					<div
						v-for="p in activeMeal.Periods"
						:key="p.id"
						class="flex items-center justify-between gap-2 rounded-lg border border-default p-3"
					>
						<div v-if="editingPeriod?.id !== p.id" class="text-sm">
							<span class="font-medium">
								{{ new Date(p.valid_from).toLocaleDateString() }}
							</span>
							<span class="text-muted">—</span>
							<span class="font-medium">
								{{
									p.valid_to
										? new Date(p.valid_to).toLocaleDateString()
										: t("common.open_ended")
								}}
							</span>
						</div>
						<div v-else class="flex gap-2 flex-1">
							<UInput v-model="periodForm.valid_from" type="date" size="sm" />
							<UInput v-model="periodForm.valid_to" type="date" size="sm" />
							<UButton size="sm" :loading="periodSaving" @click="savePeriod">
								Save
							</UButton>
							<UButton size="sm" variant="ghost" @click="editingPeriod = null">
								✕
							</UButton>
						</div>
						<div v-if="editingPeriod?.id !== p.id" class="flex gap-1">
							<UButton
								size="xs"
								variant="ghost"
								icon="i-lucide-pencil"
								@click="editPeriod(p)"
							/>
							<UButton
								size="xs"
								variant="ghost"
								color="error"
								icon="i-lucide-trash-2"
								:loading="periodDeleting === p.id"
								@click="deletePeriod(p.id)"
							/>
						</div>
					</div>
				</div>
				<div v-else class="text-muted text-sm">
					{{ t("common.no_date_ranges") }}
				</div>

				<!-- Add new period -->
				<div
					v-if="!editingPeriod"
					class="border-t border-default pt-4 flex flex-col gap-3"
				>
					<div class="font-medium text-sm">
						{{ t("common.add_date_range") }}
					</div>
					<UFormField :label="t('common.from')" required>
						<UInput v-model="periodForm.valid_from" type="date" />
					</UFormField>
					<UFormField :label="t('common.to')">
						<UInput v-model="periodForm.valid_to" type="date" />
					</UFormField>
					<UButton :loading="periodSaving" @click="savePeriod">
						{{ t("common.add_range") }}
					</UButton>
				</div>
			</div>
		</template>
	</USlideover>
</template>
