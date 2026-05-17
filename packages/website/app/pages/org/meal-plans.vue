<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "org" });

const UBtn = resolveComponent("UButton");
const { $client } = useNuxtApp();
const toast = useToast();
const { t, locale } = useI18n();

const { data: plans, refresh } = $client.org.mealPlans.list.useQuery(
	undefined,
	{
		lazy: true,
	}
);
const { data: availableMeals } =
	$client.org.mealPlans.listAvailableMeals.useQuery(undefined, {
		lazy: true,
	});

type Plan = NonNullable<typeof plans.value>[number];
type PlanMealItem = Plan["Meals"][number];
type PlanDay = Plan["Days"][number];

const planOpen = ref(false);
const editingPlan = ref<Plan | null>(null);
const planForm = reactive({
	label_uk: "",
	label_en: "",
	valid_from: "",
	valid_to: "",
});
const planSaving = ref(false);
const planDeleting = ref<number | null>(null);

const mealsOpen = ref(false);
const activePlan = ref<Plan | null>(null);
const mealAdding = ref<number | null>(null);
const mealRemoving = ref<number | null>(null);
const courseAdding = ref<number | null>(null);
const courseRemoving = ref<number | null>(null);

const daysOpen = ref(false);
const activePlanDays = ref<Plan | null>(null);
const newDayDate = ref("");
const dayAdding = ref(false);
const dayRemoving = ref<number | null>(null);

// plan form helpers
function openCreatePlan() {
	editingPlan.value = null;
	Object.assign(planForm, {
		label_uk: "",
		label_en: "",
		valid_from: "",
		valid_to: "",
	});
	planOpen.value = true;
}
function openEditPlan(p: Plan) {
	editingPlan.value = p;
	planForm.label_uk = p.label_uk;
	planForm.label_en = p.label_en;
	planForm.valid_from = new Date(p.valid_from).toISOString().slice(0, 10);
	planForm.valid_to = p.valid_to
		? new Date(p.valid_to).toISOString().slice(0, 10)
		: "";
	planOpen.value = true;
}

async function savePlan() {
	if (!planForm.label_uk || !planForm.label_en || !planForm.valid_from) {
		toast.add({
			title: t("op.plan_label_req"),
			color: "error",
		});
		return;
	}
	planSaving.value = true;
	try {
		const payload = {
			label_uk: planForm.label_uk,
			label_en: planForm.label_en,
			valid_from: new Date(planForm.valid_from),
			valid_to: planForm.valid_to ? new Date(planForm.valid_to) : null,
		};
		if (editingPlan.value) {
			await $client.org.mealPlans.update.mutate({
				id: editingPlan.value.id,
				...payload,
			});
			toast.add({ title: t("op.plan_updated") });
		} else {
			await $client.org.mealPlans.create.mutate(payload);
			toast.add({ title: t("op.plan_created") });
		}
		planOpen.value = false;
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		planSaving.value = false;
	}
}

async function deletePlan(id: number) {
	planDeleting.value = id;
	try {
		await $client.org.mealPlans.delete.mutate({ id });
		toast.add({ title: t("op.plan_deleted") });
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		planDeleting.value = null;
	}
}

// meals management
function openManageMeals(p: Plan) {
	activePlan.value = p;
	mealsOpen.value = true;
}

function syncActivePlan() {
	if (activePlan.value)
		activePlan.value =
			plans.value?.find((p) => p.id === activePlan.value!.id) ?? null;
	if (activePlanDays.value)
		activePlanDays.value =
			plans.value?.find((p) => p.id === activePlanDays.value!.id) ?? null;
}

async function addMeal(meal_id: number) {
	mealAdding.value = meal_id;
	try {
		await $client.org.mealPlans.addMeal.mutate({
			meal_plan_id: activePlan.value!.id,
			meal_id,
		});
		toast.add({ title: t("op.meal_added") });
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		mealAdding.value = null;
	}
}

async function removeMeal(planMealId: number) {
	mealRemoving.value = planMealId;
	try {
		await $client.org.mealPlans.removeMeal.mutate({ id: planMealId });
		toast.add({ title: t("op.meal_removed") });
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		mealRemoving.value = null;
	}
}

async function addCourse(plan_meal_id: number, course_id: number) {
	courseAdding.value = course_id;
	try {
		await $client.org.mealPlans.addCourse.mutate({ plan_meal_id, course_id });
		toast.add({ title: t("op.course_enabled") });
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		courseAdding.value = null;
	}
}

async function removeCourse(planCourseId: number) {
	courseRemoving.value = planCourseId;
	try {
		await $client.org.mealPlans.removeCourse.mutate({ id: planCourseId });
		toast.add({ title: t("op.course_disabled") });
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		courseRemoving.value = null;
	}
}

// days management
function openManageDays(p: Plan) {
	activePlanDays.value = p;
	newDayDate.value = "";
	daysOpen.value = true;
}

async function addDay() {
	if (!newDayDate.value) return;
	dayAdding.value = true;
	try {
		await $client.org.mealPlans.addDay.mutate({
			meal_plan_id: activePlanDays.value!.id,
			date: new Date(newDayDate.value),
		});
		toast.add({ title: t("op.day_added") });
		newDayDate.value = "";
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		dayAdding.value = false;
	}
}

async function removeDay(id: number) {
	dayRemoving.value = id;
	try {
		await $client.org.mealPlans.removeDay.mutate({ id });
		toast.add({ title: t("op.day_removed") });
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		dayRemoving.value = null;
	}
}

const presetFrom = ref("");
const presetTo = ref("");
const presetWeekdays = ref<number[]>([1, 2, 3, 4, 5]); // Mon–Fri
const presetsAdding = ref(false);

async function applyPreset() {
	if (!presetFrom.value || !presetTo.value) {
		toast.add({ title: t("op.select_date_range"), color: "error" });
		return;
	}
	presetsAdding.value = true;
	try {
		const result = await $client.org.mealPlans.addDays.mutate({
			meal_plan_id: activePlanDays.value!.id,
			from: new Date(presetFrom.value),
			to: new Date(presetTo.value),
			weekdays: presetWeekdays.value.length ? presetWeekdays.value : undefined,
		});
		toast.add({ title: t("op.days_added", { count: result.count }) });
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		presetsAdding.value = false;
	}
}

const defaultSetting = ref<number | null>(null);

async function setDefault(
	plan_course_id: number,
	course_option_id: number | null
) {
	defaultSetting.value = plan_course_id;
	try {
		await $client.org.mealPlans.setDefault.mutate({
			plan_course_id,
			course_option_id,
		});
		await refresh();
		syncActivePlan();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		defaultSetting.value = null;
	}
}

// table
type PlanRow = Plan & { mealsCount: number; daysCount: number };

const columns = computed((): TableColumn<PlanRow>[] => [
	{ accessorKey: "label_uk", header: t("op.plan_col") },
	{
		accessorKey: "valid_from",
		header: t("common.from"),
		cell: ({ row }) =>
			h("span", {}, new Date(row.original.valid_from).toLocaleDateString()),
	},
	{
		accessorKey: "valid_to",
		header: t("common.to"),
		cell: ({ row }) =>
			h(
				"span",
				{},
				row.original.valid_to
					? new Date(row.original.valid_to).toLocaleDateString()
					: "—"
			),
	},
	{ accessorKey: "mealsCount", header: t("op.plans_col_meals") },
	{ accessorKey: "daysCount", header: t("op.plans_col_days") },
	{
		id: "actions",
		cell: ({ row }) =>
			h("div", { class: "flex items-center gap-2 justify-end" }, [
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-utensils",
					title: "Manage meals",
					class: "cursor-pointer",
					onClick: () => openManageMeals(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-calendar-days",
					title: "Manage days",
					class: "cursor-pointer",
					onClick: () => openManageDays(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-pencil",
					class: "cursor-pointer",
					onClick: () => openEditPlan(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					color: "error",
					icon: "i-lucide-trash-2",
					loading: planDeleting.value === row.original.id,
					class: "cursor-pointer",
					onClick: () => deletePlan(row.original.id),
				}),
			]),
	},
]);

const rows = computed((): PlanRow[] =>
	(plans.value ?? []).map((p) => ({
		...p,
		mealsCount: p.Meals.length,
		daysCount: p.Days.length,
	}))
);

// helpers for meals slideover
const planMealIds = computed(
	() => new Set(activePlan.value?.Meals.map((m) => m.meal_id) ?? [])
);

function getCourseIds(pm: PlanMealItem) {
	return new Set(pm.Courses.map((c) => c.course_id));
}
</script>

<template>
	<UDashboardPanel id="meal-plans">
		<template #header>
			<UDashboardNavbar :title="t('nav.meal_plans')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-plus" @click="openCreatePlan">
						{{ t("op.new_plan") }}
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

	<!-- Create / edit plan -->
	<USlideover
		v-model:open="planOpen"
		:title="editingPlan ? t('op.edit_plan') : t('op.new_meal_plan')"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<UFormField :label="t('common.label_uk')" required>
					<UInput v-model="planForm.label_uk" placeholder="e.g. Весна 2026" />
				</UFormField>
				<UFormField :label="t('common.label_en')" required>
					<UInput v-model="planForm.label_en" placeholder="e.g. Spring 2026" />
				</UFormField>
				<UFormField :label="t('common.valid_from')" required>
					<UInput v-model="planForm.valid_from" type="date" />
				</UFormField>
				<UFormField :label="t('common.valid_to')">
					<UInput v-model="planForm.valid_to" type="date" />
				</UFormField>
			</div>
		</template>
		<template #footer>
			<div class="flex gap-3 p-4">
				<UButton variant="ghost" class="flex-1" @click="planOpen = false">
					{{ t("common.cancel") }}
				</UButton>
				<UButton class="flex-1" :loading="planSaving" @click="savePlan">
					{{ editingPlan ? t("common.save_changes") : t("common.create") }}
				</UButton>
			</div>
		</template>
	</USlideover>

	<!-- Manage meals -->
	<USlideover
		v-model:open="mealsOpen"
		:title="`Meals — ${activePlan?.label_uk}`"
		side="right"
	>
		<template #body>
			<div class="flex flex-col gap-6 p-4">
				<!-- Current plan meals -->
				<div>
					<div class="font-medium text-sm mb-3">{{ t("op.plan_meals") }}</div>
					<div v-if="activePlan?.Meals.length" class="flex flex-col gap-3">
						<div
							v-for="pm in activePlan.Meals"
							:key="pm.id"
							class="rounded-lg border border-default p-3"
						>
							<div class="flex items-center justify-between mb-2">
								<span class="font-medium">{{ pm.Meal.label_uk }}</span>
								<UButton
									size="xs"
									color="error"
									variant="ghost"
									icon="i-lucide-trash-2"
									:loading="mealRemoving === pm.id"
									class="cursor-pointer"
									@click="removeMeal(pm.id)"
								/>
							</div>
							<!-- Courses for this plan meal -->
							<div class="pl-2 flex flex-col gap-1">
								<div class="text-xs text-muted mb-1">
									{{ t("op.enabled_courses") }}
								</div>
								<div
									v-for="c in pm.Courses"
									:key="c.id"
									class="rounded border border-default p-2 mb-1"
								>
									<div class="flex items-center justify-between text-sm mb-1.5">
										<span>{{ c.Course.label_uk }}</span>
										<UButton
											size="xs"
											variant="ghost"
											color="error"
											icon="i-lucide-x"
											:loading="courseRemoving === c.id"
											class="cursor-pointer"
											@click="removeCourse(c.id)"
										/>
									</div>
									<USelect
										:model-value="c.Default?.course_option_id ?? null"
										:items="[
											{ value: null, label: t('op.no_default') },
											...c.Course.Options.map((o) => ({
												value: o.id,
												label: o.Dish[`name_${locale}`] || o.Dish.name_uk,
											})),
										]"
										value-key="value"
										option-attribute="label"
										size="xs"
										:placeholder="t('op.default_dish')"
										:loading="defaultSetting === c.id"
										:disabled="defaultSetting !== null"
										@update:model-value="setDefault(c.id, $event)"
									/>
								</div>
								<!-- Add courses from available -->
								<div
									v-for="ac in availableMeals
										?.find((m) => m.id === pm.meal_id)
										?.Courses.filter((c) => !getCourseIds(pm).has(c.id))"
									:key="ac.id"
									class="flex items-center justify-between text-sm text-muted"
								>
									<span>{{ ac.label_uk }}</span>
									<UButton
										size="xs"
										variant="ghost"
										icon="i-lucide-plus"
										:loading="courseAdding === ac.id"
										class="cursor-pointer"
										@click="addCourse(pm.id, ac.id)"
									/>
								</div>
							</div>
						</div>
					</div>
					<div v-else class="text-muted text-sm">
						{{ t("op.no_meals_added") }}
					</div>
				</div>

				<!-- Available meals to add -->
				<div>
					<div class="font-medium text-sm mb-3">
						{{ t("op.available_meals") }}
					</div>
					<div
						v-if="availableMeals?.filter((m) => !planMealIds.has(m.id)).length"
						class="flex flex-col gap-2"
					>
						<div
							v-for="m in availableMeals?.filter((m) => !planMealIds.has(m.id))"
							:key="m.id"
							class="flex items-center justify-between rounded-lg border border-default p-3"
						>
							<div>
								<div class="font-medium text-sm">
									{{ m[`label_${locale}`] || m.label_uk }}
								</div>
								<div v-if="m.description" class="text-xs text-muted">
									{{ m.description }}
								</div>
								<div class="text-xs text-muted">
									{{ m.Caterer[`name_${locale}`] || m.Caterer.name_uk }}
								</div>
							</div>
							<UButton
								size="sm"
								variant="ghost"
								icon="i-lucide-plus"
								:loading="mealAdding === m.id"
								class="cursor-pointer"
								@click="addMeal(m.id)"
							/>
						</div>
					</div>
					<div v-else class="text-muted text-sm">
						{{
							availableMeals?.length
								? t("op.all_meals_added")
								: t("op.no_meals_available")
						}}
					</div>
				</div>
			</div>
		</template>
	</USlideover>

	<!-- Manage days -->
	<USlideover
		v-model:open="daysOpen"
		:title="`Days — ${activePlanDays?.label_uk}`"
		side="right"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<!-- Quick presets -->
				<UCard :ui="{ body: 'flex flex-col gap-3' }">
					<template #header>
						<span class="text-sm font-medium">{{ t("op.quick_presets") }}</span>
					</template>
					<div class="flex gap-2 flex-wrap">
						<UButton
							size="xs"
							variant="soft"
							:color="
								presetWeekdays.length === 5 &&
								!presetWeekdays.includes(0) &&
								!presetWeekdays.includes(6)
									? 'primary'
									: 'neutral'
							"
							@click="presetWeekdays = [1, 2, 3, 4, 5]"
						>
							{{ t("op.weekdays") }}
						</UButton>
						<UButton
							size="xs"
							variant="soft"
							:color="presetWeekdays.length === 6 ? 'primary' : 'neutral'"
							@click="presetWeekdays = [1, 2, 3, 4, 5, 6]"
						>
							{{ t("op.mon_sat") }}
						</UButton>
						<UButton
							size="xs"
							variant="soft"
							:color="presetWeekdays.length === 0 ? 'primary' : 'neutral'"
							@click="presetWeekdays = []"
						>
							{{ t("op.every_day") }}
						</UButton>
					</div>
					<div class="flex gap-2">
						<UFormField :label="t('common.from')" class="flex-1">
							<UInput v-model="presetFrom" type="date" size="sm" />
						</UFormField>
						<UFormField :label="t('common.to')" class="flex-1">
							<UInput v-model="presetTo" type="date" size="sm" />
						</UFormField>
					</div>
					<UButton :loading="presetsAdding" size="sm" @click="applyPreset">
						{{ t("op.apply_range") }}
					</UButton>
				</UCard>

				<!-- Add single day -->
				<div class="flex gap-2 items-end">
					<UFormField :label="t('op.add_single_day')" class="flex-1">
						<UInput v-model="newDayDate" type="date" />
					</UFormField>
					<UButton :loading="dayAdding" @click="addDay">
						{{ t("common.add") }}
					</UButton>
				</div>

				<!-- Existing days -->
				<div v-if="activePlanDays?.Days.length" class="flex flex-col gap-3">
					<div
						v-for="day in activePlanDays.Days"
						:key="day.id"
						class="rounded-lg border border-default p-3"
					>
						<div class="flex items-center justify-between mb-2">
							<span class="font-medium">
								{{ new Date(day.date).toLocaleDateString() }}
							</span>
							<div class="flex items-center gap-1">
								<UButton
									size="xs"
									variant="ghost"
									icon="i-lucide-table-2"
									:to="`/org/plan-day/${day.id}`"
									title="View stats"
									class="cursor-pointer"
								/>
								<UButton
									size="xs"
									variant="ghost"
									icon="i-lucide-users-round"
									:to="`/org/plan-day/${day.id}/roster`"
									title="Manage diners"
									class="cursor-pointer"
								/>
								<UButton
									size="xs"
									color="error"
									variant="ghost"
									icon="i-lucide-trash-2"
									:loading="dayRemoving === day.id"
									class="cursor-pointer"
									@click="removeDay(day.id)"
								/>
							</div>
						</div>
					</div>
				</div>
				<div v-else class="text-muted text-sm">{{ t("op.no_days_added") }}</div>
			</div>
		</template>
	</USlideover>
</template>
