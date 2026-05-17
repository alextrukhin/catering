<script setup lang="ts">
definePageMeta({ layout: "org" });

const route = useRoute();
const { $client } = useNuxtApp();
const { locale } = useI18n();

const dayId = computed(() => Number(route.params.id));

const {
	data: day,
	pending,
	refresh,
} = $client.org.mealPlans.getDay.useQuery(
	computed(() => ({ id: dayId.value })),
	{ lazy: true }
);

type ColDef = {
	planMealId: number;
	mealLabel: string;
	planCourseId: number;
	courseLabel: string;
};

const cols = computed<ColDef[]>(() => {
	if (!day.value) return [];
	return day.value.MealPlan.Meals.flatMap((pm) =>
		pm.Courses.map((pc) => ({
			planMealId: pm.id,
			mealLabel: pm.Meal[`label_${locale.value}`] || pm.Meal.label_uk,
			planCourseId: pc.id,
			courseLabel: pc.Course[`label_${locale.value}`] || pc.Course.label_uk,
		}))
	);
});

// Header groups: consecutive cols that share the same meal
const mealHeaderGroups = computed(() => {
	const groups: { label: string; span: number }[] = [];
	for (const col of cols.value) {
		const last = groups.at(-1);
		if (last && last.label === col.mealLabel) {
			last.span++;
		} else {
			groups.push({ label: col.mealLabel, span: 1 });
		}
	}
	return groups;
});

type DinerEntry = NonNullable<typeof day.value>["Diners"][number];

function getDish(
	diner: DinerEntry,
	_planMealId: number,
	planCourseId: number
): string | null | undefined {
	const sel = diner.DishSelections.find(
		(s) => s.plan_course_id === planCourseId
	);
	if (!sel) return null;
	return (
		sel.CourseOption.Dish[`name_${locale.value}`] ||
		sel.CourseOption.Dish.name_uk ||
		null
	);
}

function selectionCount(diner: DinerEntry) {
	const total = cols.value.length;
	if (total === 0)
		return {
			selected: diner.DishSelections.length,
			total: day.value?.MealPlan.Meals.length ?? 0,
		};
	let selected = 0;
	for (const col of cols.value) {
		if (getDish(diner, col.planMealId, col.planCourseId) != null) selected++;
	}
	return { selected, total };
}

type Group = { id: number | null; name: string; diners: DinerEntry[] };

const groups = computed((): Group[] => {
	if (!day.value) return [];
	const map = new Map<number | null, Group>();

	for (const entry of day.value.Diners) {
		// Use first group as primary placement
		const primary = entry.Diner.Groups[0]?.Group ?? null;
		const key = primary?.id ?? null;
		let g = map.get(key);
		if (!g) {
			g = {
				id: key,
				name: primary
					? primary[`name_${locale.value}`] || primary.name_uk
					: "Ungrouped",
				diners: [],
			};
			map.set(key, g);
		}
		g.diners.push(entry);
	}

	return [...map.values()].sort((a, b) => {
		if (a.id === null) return 1;
		if (b.id === null) return -1;
		return a.name.localeCompare(b.name);
	});
});

const totalDiners = computed(() => day.value?.Diners.length ?? 0);
const totalMeals = computed(() => day.value?.MealPlan.Meals.length ?? 0);

const fullySelected = computed(() => {
	if (!day.value || totalMeals.value === 0) return 0;
	return day.value.Diners.filter(
		(d) => d.DishSelections.length >= cols.value.length
	).length;
});

const dateLabel = computed(() =>
	day.value
		? new Intl.DateTimeFormat("uk-UA", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
				timeZone: "UTC",
			}).format(new Date(day.value.date as string))
		: ""
);

const removing = ref<number | null>(null);
const toast = useToast();

async function removeDiner(planDayDinerId: number) {
	removing.value = planDayDinerId;
	try {
		await $client.org.mealPlans.removeDiner.mutate({ id: planDayDinerId });
		await refresh();
	} catch {
		toast.add({ title: "Failed to remove diner", color: "error" });
	} finally {
		removing.value = null;
	}
}
</script>

<template>
	<UDashboardPanel id="plan-day">
		<template #header>
			<UDashboardNavbar>
				<template #leading>
					<UDashboardSidebarCollapse />
					<UButton
						variant="ghost"
						size="sm"
						icon="i-lucide-arrow-left"
						to="/org/meal-plans"
						class="ml-1"
					/>
				</template>
				<template #title>
					<div v-if="day" class="flex flex-col leading-tight">
						<span class="font-semibold capitalize">{{ dateLabel }}</span>
						<span class="text-xs text-muted font-normal">
							{{ day.MealPlan[`label_${locale}`] || day.MealPlan.label_uk }}
						</span>
					</div>
					<span v-else class="text-muted">Loading…</span>
				</template>
				<template #right>
					<div
						v-if="day"
						class="flex items-center gap-4 text-sm text-muted pr-2"
					>
						<span>
							<span class="font-semibold text-highlighted">
								{{ totalDiners }}
							</span>
							diners
						</span>
						<span>
							<span class="font-semibold text-highlighted">
								{{ fullySelected }}
							</span>
							/{{ totalDiners }} complete
						</span>
					</div>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="pending" class="flex justify-center items-center h-40">
				<UIcon
					name="i-lucide-loader-circle"
					class="size-7 animate-spin text-muted"
				/>
			</div>

			<div
				v-else-if="!day"
				class="flex justify-center items-center h-40 text-muted text-sm"
			>
				Day not found.
			</div>

			<div
				v-else-if="totalDiners === 0"
				class="flex justify-center items-center h-40 text-muted text-sm"
			>
				No diners assigned to this day.
			</div>

			<div v-else class="overflow-x-auto">
				<table class="w-full text-sm border-collapse min-w-max">
					<thead class="sticky top-0 z-10">
						<!-- Meal row -->
						<tr>
							<th
								rowspan="2"
								class="sticky left-0 z-20 text-left px-4 py-2 font-medium text-muted bg-background border-b border-r border-default whitespace-nowrap min-w-48"
							>
								Diner
							</th>
							<th
								rowspan="2"
								class="px-3 py-2 font-medium text-muted bg-background border-b border-r border-default whitespace-nowrap text-center"
							>
								Status
							</th>
							<th
								v-for="(group, gi) in mealHeaderGroups"
								:key="gi"
								:colspan="group.span"
								class="px-3 py-2 font-medium text-highlighted bg-elevated border-b border-r border-default whitespace-nowrap text-center"
							>
								{{ group.label }}
							</th>
							<th
								rowspan="2"
								class="px-3 py-2 bg-background border-b border-default w-10"
							/>
						</tr>
						<!-- Course row -->
						<tr>
							<th
								v-for="col in cols"
								:key="col.planCourseId"
								class="px-3 py-1.5 font-normal text-muted bg-background border-b border-r border-default whitespace-nowrap text-center text-xs"
							>
								{{ col.courseLabel }}
							</th>
						</tr>
					</thead>

					<tbody>
						<template v-for="group in groups" :key="group.id ?? 'ungrouped'">
							<!-- Group header row -->
							<tr class="bg-elevated/60">
								<td
									:colspan="3 + cols.length"
									class="px-4 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider border-b border-default"
								>
									{{ group.name }}
									<span class="ml-2 font-normal normal-case tracking-normal">
										({{ group.diners.length }})
									</span>
								</td>
							</tr>

							<!-- Diner rows -->
							<tr
								v-for="entry in group.diners"
								:key="entry.id"
								class="border-b border-default hover:bg-elevated/30 transition-colors"
							>
								<!-- Name (sticky) -->
								<td
									class="sticky left-0 z-10 px-4 py-2.5 bg-background font-medium text-highlighted border-r border-default whitespace-nowrap"
								>
									{{ entry.Diner.last_name }} {{ entry.Diner.first_name }}
								</td>

								<!-- Status badge -->
								<td class="px-3 py-2.5 text-center border-r border-default">
									<span
										class="inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
										:class="
											selectionCount(entry).selected ===
												selectionCount(entry).total &&
											selectionCount(entry).total > 0
												? 'bg-green-500/10 text-green-600 dark:text-green-400'
												: selectionCount(entry).selected > 0
													? 'bg-yellow-400/10 text-yellow-600 dark:text-yellow-400'
													: 'bg-red-400/10 text-red-500 dark:text-red-400'
										"
									>
										{{ selectionCount(entry).selected }}/{{
											selectionCount(entry).total
										}}
									</span>
								</td>

								<!-- Course cells -->
								<td
									v-for="col in cols"
									:key="col.planCourseId"
									class="px-3 py-2.5 border-r border-default text-center"
								>
									<template
										v-if="
											getDish(entry, col.planMealId, col.planCourseId) ===
											undefined
										"
									>
										<span class="text-muted/40 text-xs">—</span>
									</template>
									<template
										v-else-if="
											getDish(entry, col.planMealId, col.planCourseId) === null
										"
									>
										<span class="text-yellow-500 text-xs">·</span>
									</template>
									<template v-else>
										<span
											class="text-xs text-highlighted"
											:title="
												getDish(entry, col.planMealId, col.planCourseId) ?? ''
											"
										>
											{{
												(getDish(entry, col.planMealId, col.planCourseId) ?? "")
													.length > 18
													? getDish(
															entry,
															col.planMealId,
															col.planCourseId
														)!.slice(0, 16) + "…"
													: getDish(entry, col.planMealId, col.planCourseId)
											}}
										</span>
									</template>
								</td>

								<!-- Remove -->
								<td class="px-2 py-2.5 text-center">
									<UButton
										variant="ghost"
										size="xs"
										color="error"
										icon="i-lucide-x"
										:loading="removing === entry.id"
										@click="removeDiner(entry.id)"
									/>
								</td>
							</tr>
						</template>
					</tbody>
				</table>
			</div>
		</template>
	</UDashboardPanel>
</template>
