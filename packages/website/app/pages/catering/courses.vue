<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "catering" });

const UBtn = resolveComponent("UButton");
const { $client } = useNuxtApp();
const toast = useToast();
const { t, locale } = useI18n();

const { data: courses, refresh } = $client.catering.courses.list.useQuery();
const { data: meals } = $client.catering.meals.list.useQuery();
const { data: dishes } = $client.catering.dishes.list.useQuery();

type Course = NonNullable<typeof courses.value>[number];
type Period = {
	id: number;
	valid_from: Date | string;
	valid_to: Date | string | null;
};

const slideOpen = ref(false);
const editing = ref<Course | null>(null);
const form = reactive({
	meal_id: undefined as number | undefined,
	label_uk: "",
	label_en: "",
});
const saving = ref(false);
const deleting = ref<number | null>(null);

const mealOptions = computed(() =>
	(meals.value ?? []).map((m) => ({
		label: m[`label_${locale.value}`] || m.label_uk,
		value: m.id,
	}))
);

function openCreate() {
	editing.value = null;
	form.meal_id = undefined;
	form.label_uk = "";
	form.label_en = "";
	slideOpen.value = true;
}

function openEdit(c: Course) {
	editing.value = c;
	form.meal_id = c.meal_id;
	form.label_uk = c.label_uk;
	form.label_en = c.label_en;
	slideOpen.value = true;
}

function syncEditing() {
	if (editing.value)
		editing.value =
			courses.value?.find((c) => c.id === editing.value!.id) ?? null;
}

async function save() {
	if (!form.label_uk || !form.label_en) {
		toast.add({ title: t("ct.course_label_req"), color: "error" });
		return;
	}
	saving.value = true;
	try {
		if (editing.value) {
			await $client.catering.courses.update.mutate({
				id: editing.value.id,
				label_uk: form.label_uk,
				label_en: form.label_en,
			});
			toast.add({ title: t("ct.course_updated") });
		} else {
			if (!form.meal_id) {
				toast.add({ title: t("ct.course_meal_req"), color: "error" });
				return;
			}
			await $client.catering.courses.create.mutate({
				meal_id: form.meal_id,
				label_uk: form.label_uk,
				label_en: form.label_en,
			});
			toast.add({ title: t("ct.course_created") });
		}
		slideOpen.value = false;
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

async function deleteCourse(id: number) {
	deleting.value = id;
	try {
		await $client.catering.courses.delete.mutate({ id });
		toast.add({ title: t("ct.course_deleted") });
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

const selectedOption = ref<number | undefined>(undefined);
const optionAdding = ref(false);
const optionRemoving = ref<number | null>(null);

const optionIds = computed(
	() => new Set(editing.value?.Options.map((o) => o.dish_id) ?? [])
);

const availableDishOptions = computed(() =>
	(dishes.value ?? [])
		.filter((d) => !optionIds.value.has(d.id))
		.map((d) => ({
			label: d[`name_${locale.value}`] || d.name_uk,
			value: d.id,
		}))
);

async function addOption() {
	if (!selectedOption.value || !editing.value) return;
	optionAdding.value = true;
	try {
		await $client.catering.courses.addOption.mutate({
			course_id: editing.value.id,
			dish_id: selectedOption.value,
		});
		toast.add({ title: t("ct.option_added") });
		selectedOption.value = undefined;
		await refresh();
		syncEditing();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		optionAdding.value = false;
	}
}

async function removeOption(id: number) {
	optionRemoving.value = id;
	try {
		await $client.catering.courses.removeOption.mutate({ id });
		toast.add({ title: t("ct.option_removed") });
		await refresh();
		syncEditing();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		optionRemoving.value = null;
	}
}

const periodOpen = ref(false);
const activeCourse = ref<Course | null>(null);
const editingPeriod = ref<Period | null>(null);
const periodForm = reactive({ valid_from: "", valid_to: "" });
const periodSaving = ref(false);
const periodDeleting = ref<number | null>(null);

const activePeriods = computed(
	() => (activeCourse.value?.Periods ?? []) as Period[]
);

function openPeriods(c: Course) {
	activeCourse.value = c;
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

function syncActiveCourse() {
	if (activeCourse.value)
		activeCourse.value =
			courses.value?.find((c) => c.id === activeCourse.value?.id) ?? null;
}

async function savePeriod() {
	periodSaving.value = true;
	try {
		if (editingPeriod.value) {
			await $client.catering.courses.updatePeriod.mutate({
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
			await $client.catering.courses.addPeriod.mutate({
				course_id: activeCourse.value!.id,
				valid_from: new Date(periodForm.valid_from),
				valid_to: periodForm.valid_to ? new Date(periodForm.valid_to) : null,
			});
			toast.add({ title: t("ct.period_added") });
		}
		editingPeriod.value = null;
		Object.assign(periodForm, { valid_from: "", valid_to: "" });
		await refresh();
		syncActiveCourse();
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
		await $client.catering.courses.removePeriod.mutate({ id });
		toast.add({ title: t("ct.period_removed") });
		await refresh();
		syncActiveCourse();
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

type CourseRow = Course & {
	mealLabel: string;
	periods: number;
	options: number;
};

const columns = computed((): TableColumn<CourseRow>[] => [
	{ accessorKey: `label_${locale.value}`, header: t("ct.course_col") },
	{ accessorKey: "mealLabel", header: t("ct.course_meal_col") },
	{
		accessorKey: "options",
		header: t("ct.dish_options"),
		cell: ({ row }) => h("span", {}, String(row.original.options)),
	},
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
					class: "cursor-pointer",
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
					class: "cursor-pointer",
					onClick: () => openEdit(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					color: "error",
					icon: "i-lucide-trash-2",
					loading: deleting.value === row.original.id,
					class: "cursor-pointer",
					onClick: () => deleteCourse(row.original.id),
				}),
			]),
	},
]);

const rows = computed((): CourseRow[] =>
	(courses.value ?? []).map((c) => ({
		...c,
		mealLabel: c.Meal[`label_${locale.value}`] || c.Meal.label_uk,
		periods: c.Periods.length,
		options: c.Options.length,
	}))
);
</script>

<template>
	<UDashboardPanel id="courses">
		<template #header>
			<UDashboardNavbar :title="t('nav.courses')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-plus" @click="openCreate">
						{{ t("ct.new_course") }}
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

	<!-- Create / edit slideover -->
	<USlideover
		v-model:open="slideOpen"
		:title="editing ? t('ct.edit_course') : t('ct.new_course')"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<UFormField :label="t('ct.course_meal_col')" :required="!editing">
					<USelect
						v-model="form.meal_id"
						:items="mealOptions"
						value-key="value"
						option-attribute="label"
						:placeholder="t('ct.select_meal_ph')"
						:disabled="!!editing"
					/>
				</UFormField>

				<UFormField :label="t('common.label_uk')" required>
					<UInput v-model="form.label_uk" placeholder="e.g. Суп" />
				</UFormField>
				<UFormField :label="t('common.label_en')" required>
					<UInput v-model="form.label_en" placeholder="e.g. Soup course" />
				</UFormField>

				<!-- Dish options (edit only) -->
				<div
					v-if="editing"
					class="border-t border-default pt-4 flex flex-col gap-3"
				>
					<div class="font-medium text-sm">{{ t("ct.dish_options") }}</div>

					<div v-if="editing.Options.length" class="flex flex-col gap-2">
						<div
							v-for="opt in editing.Options"
							:key="opt.id"
							class="flex items-center justify-between rounded-lg border border-default px-3 py-2"
						>
							<span class="text-sm">
								{{ opt.Dish[`name_${locale}`] || opt.Dish.name_uk }}
							</span>
							<UButton
								size="xs"
								variant="ghost"
								color="error"
								icon="i-lucide-x"
								:loading="optionRemoving === opt.id"
								class="cursor-pointer"
								@click="removeOption(opt.id)"
							/>
						</div>
					</div>
					<p v-else class="text-muted text-sm">{{ t("ct.no_dish_options") }}</p>

					<div class="flex gap-2">
						<USelect
							v-model="selectedOption"
							:items="availableDishOptions"
							value-key="value"
							option-attribute="label"
							placeholder="Select dish…"
							class="flex-1"
						/>
						<UButton
							:loading="optionAdding"
							:disabled="!selectedOption"
							@click="addOption"
						>
							{{ t("common.add") }}
						</UButton>
					</div>
				</div>
				<p v-else class="text-muted text-xs border-t border-default pt-3">
					{{ t("ct.save_course_first") }}
				</p>
			</div>
		</template>
		<template #footer>
			<div class="flex gap-3 p-4">
				<UButton variant="ghost" class="flex-1" @click="slideOpen = false">
					{{ t("common.cancel") }}
				</UButton>
				<UButton class="flex-1" :loading="saving" @click="save">
					{{ editing ? t("common.save_changes") : t("common.create") }}
				</UButton>
			</div>
		</template>
	</USlideover>

	<!-- Periods slideover -->
	<USlideover
		v-model:open="periodOpen"
		:title="`Periods — ${activeCourse ? activeCourse[`label_${locale}`] || activeCourse.label_uk : ''}`"
		side="right"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<div v-if="activePeriods.length" class="flex flex-col gap-2">
					<div
						v-for="p in activePeriods"
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
