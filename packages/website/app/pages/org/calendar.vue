<script setup lang="ts">
definePageMeta({ layout: "org" });

const { $client } = useNuxtApp();
const { locale } = useI18n();
const toast = useToast();

const today = new Date();
const calYear = ref(today.getFullYear());
const calMonth = ref(today.getMonth() + 1);

const { data: calDays, refresh: refreshCal } =
	$client.org.mealPlans.getCalendarDays.useQuery(
		computed(() => ({ year: calYear.value, month: calMonth.value })),
		{ lazy: true }
	);

const dayMap = computed(() => {
	const map = new Map<string, { id: number; label: string }>();
	for (const d of calDays.value ?? []) {
		map.set(new Date(d.date).toISOString().slice(0, 10), {
			id: d.id,
			label: d.MealPlan[`label_${locale.value}`] || d.MealPlan.label_uk,
		});
	}
	return map;
});

const activeDates = computed(() => new Set(dayMap.value.keys()));

const selectedDayId = ref<number | undefined>(undefined);
const selectedDayKey = ref<string | undefined>(undefined);

function onDayClick(day: { key: string }) {
	const entry = dayMap.value.get(day.key);
	if (!entry) return;
	if (selectedDayId.value === entry.id) {
		selectedDayId.value = undefined;
		selectedDayKey.value = undefined;
	} else {
		selectedDayId.value = entry.id;
		selectedDayKey.value = day.key;
		refreshRoster();
	}
}

watch([calYear, calMonth], () => {
	selectedDayId.value = undefined;
	selectedDayKey.value = undefined;
});

const {
	data: rosterData,
	pending: rosterPending,
	refresh: refreshRoster,
} = $client.org.mealPlans.getDayRoster.useQuery(
	computed(() => ({ id: selectedDayId.value ?? 0 })),
	{ lazy: true, immediate: false, watch: false }
);

const assigned = reactive<Record<number, number | undefined>>({});

watch(
	rosterData,
	(d) => {
		if (!d) return;
		for (const key of Object.keys(assigned)) {
			delete (assigned as Record<string, unknown>)[key];
		}
		for (const entry of d.day.Diners) {
			assigned[entry.diner_id] = entry.id;
		}
	},
	{ immediate: true }
);

const isAssigned = (dinerId: number) => assigned[dinerId] !== undefined;

const groupedDinerIds = computed(() => {
	if (!rosterData.value) return new Set<number>();
	return new Set(
		rosterData.value.groups.flatMap((g) => g.Members.map((m) => m.Diner.id))
	);
});

const ungroupedDiners = computed(() => {
	if (!rosterData.value) return [];
	return rosterData.value.allDiners.filter(
		(d) => !groupedDinerIds.value.has(d.id)
	);
});

const dinerExtraGroups = computed(() => {
	if (!rosterData.value) return new Map<number, string[]>();
	const map = new Map<number, string[]>();
	for (const g of rosterData.value.groups) {
		for (const m of g.Members) {
			const list = map.get(m.Diner.id) ?? [];
			list.push(g[`name_${locale.value}`] || g.name_uk);
			map.set(m.Diner.id, list);
		}
	}
	const extra = new Map<number, string[]>();
	for (const [id, groups] of map) {
		if (groups.length > 1) extra.set(id, groups.slice(1));
	}
	return extra;
});

type Group = NonNullable<typeof rosterData.value>["groups"][number];

const groupAllAssigned = (group: Group) =>
	group.Members.length > 0 &&
	group.Members.every((m) => isAssigned(m.Diner.id));

const pendingDiners = reactive(new Set<number>());

async function toggleDiner(dinerId: number) {
	if (pendingDiners.has(dinerId) || !selectedDayId.value) return;
	pendingDiners.add(dinerId);
	const prevId = assigned[dinerId];
	if (prevId !== undefined) {
		delete assigned[dinerId];
	} else {
		assigned[dinerId] = -1;
	}
	try {
		if (prevId !== undefined) {
			await $client.org.mealPlans.removeDiner.mutate({ id: prevId });
		} else {
			const result = await $client.org.mealPlans.addDiner.mutate({
				plan_day_id: selectedDayId.value,
				diner_id: dinerId,
			});
			assigned[dinerId] = result.id;
		}
	} catch {
		if (prevId !== undefined) {
			assigned[dinerId] = prevId;
		} else {
			delete assigned[dinerId];
		}
		toast.add({ title: "Failed to update assignment", color: "error" });
	} finally {
		pendingDiners.delete(dinerId);
	}
}

async function toggleGroup(group: Group) {
	const members = group.Members.map((m) => m.Diner);
	const targets = groupAllAssigned(group)
		? members
		: members.filter((d) => !isAssigned(d.id));
	await Promise.allSettled(targets.map((d) => toggleDiner(d.id)));
}

async function toggleUngrouped() {
	const diners = ungroupedDiners.value;
	const allOn = diners.every((d) => isAssigned(d.id));
	const targets = allOn ? diners : diners.filter((d) => !isAssigned(d.id));
	await Promise.allSettled(targets.map((d) => toggleDiner(d.id)));
}

const assignedCount = computed(() => {
	if (!rosterData.value) return 0;
	return rosterData.value.allDiners.filter((d) => isAssigned(d.id)).length;
});

const totalDiners = computed(() => rosterData.value?.allDiners.length ?? 0);

const selectedDayInfo = computed(() =>
	selectedDayKey.value ? dayMap.value.get(selectedDayKey.value) : undefined
);

const dateLabel = computed(() =>
	selectedDayKey.value
		? new Intl.DateTimeFormat("uk-UA", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
				timeZone: "UTC",
			}).format(new Date(selectedDayKey.value))
		: ""
);
</script>

<template>
	<UDashboardPanel id="org-calendar">
		<template #header>
			<UDashboardNavbar title="Calendar">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="max-w-3xl mx-auto px-4 py-8 space-y-8">
				<UCard :ui="{ body: 'p-4 sm:p-6' }">
					<MealCalendar
						v-model:year="calYear"
						v-model:month="calMonth"
						:active-dates="activeDates"
						@day-click="onDayClick"
					>
						<template #day-extra="{ day }">
							<div
								v-if="dayMap.has(day.key)"
								class="mt-0.5 size-1.5 rounded-full"
								:class="
									selectedDayKey === day.key ? 'bg-primary-500' : 'bg-blue-500'
								"
							/>
							<div v-else class="mt-0.5 size-1.5" />
						</template>
					</MealCalendar>
				</UCard>

				<template v-if="selectedDayId">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-base font-semibold capitalize text-highlighted">
								{{ dateLabel }}
							</h2>
							<p v-if="selectedDayInfo" class="text-xs text-muted mt-0.5">
								{{ selectedDayInfo.label }}
							</p>
						</div>
						<div class="text-sm text-muted">
							<span class="font-semibold text-highlighted">
								{{ assignedCount }}
							</span>
							/{{ totalDiners }} assigned
						</div>
					</div>

					<div v-if="rosterPending" class="flex justify-center py-8">
						<UIcon
							name="i-lucide-loader-circle"
							class="size-6 animate-spin text-muted"
						/>
					</div>

					<div
						v-else-if="rosterData && rosterData.allDiners.length === 0"
						class="text-sm text-center text-muted py-6"
					>
						No diners in this organisation yet.
					</div>

					<div
						v-else-if="rosterData"
						class="overflow-x-auto rounded-lg border border-default"
					>
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr>
									<th
										class="text-left px-4 py-2.5 font-medium text-muted bg-background border-b border-default"
									>
										Diner
									</th>
									<th
										class="px-4 py-2.5 font-medium text-muted bg-background border-b border-default text-right"
									>
										Assigned
									</th>
								</tr>
							</thead>
							<tbody>
								<template v-for="group in rosterData.groups" :key="group.id">
									<tr class="bg-elevated/60">
										<td
											class="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-default"
										>
											<div class="flex items-center gap-1.5">
												<UIcon
													name="i-lucide-users-round"
													class="size-3.5 shrink-0"
												/>
												{{ group[`name_${locale}`] || group.name_uk }}
												<span class="font-normal normal-case tracking-normal">
													({{ group.Members.length }})
												</span>
											</div>
										</td>
										<td class="px-4 py-2 border-b border-default text-right">
											<USwitch
												:model-value="groupAllAssigned(group)"
												:disabled="group.Members.length === 0"
												size="sm"
												@update:model-value="toggleGroup(group)"
											/>
										</td>
									</tr>
									<tr
										v-for="member in group.Members"
										:key="member.Diner.id"
										class="border-b border-default hover:bg-elevated/30 transition-colors"
										:class="{ 'opacity-50': !isAssigned(member.Diner.id) }"
									>
										<td class="px-4 py-2.5 pl-9">
											<span class="text-highlighted">
												{{ member.Diner.last_name }}
												{{ member.Diner.first_name }}
											</span>
											<span
												v-for="gName in dinerExtraGroups.get(member.Diner.id)"
												:key="gName"
												class="ml-1.5 inline-block text-xs px-1.5 py-0.5 rounded bg-elevated text-muted"
											>
												{{ gName }}
											</span>
										</td>
										<td class="px-4 py-2.5 text-right">
											<USwitch
												:model-value="isAssigned(member.Diner.id)"
												:loading="pendingDiners.has(member.Diner.id)"
												size="sm"
												@update:model-value="toggleDiner(member.Diner.id)"
											/>
										</td>
									</tr>
								</template>

								<template v-if="ungroupedDiners.length > 0">
									<tr class="bg-elevated/60">
										<td
											class="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-default"
										>
											<div class="flex items-center gap-1.5">
												<UIcon name="i-lucide-user" class="size-3.5 shrink-0" />
												Ungrouped
												<span class="font-normal normal-case tracking-normal">
													({{ ungroupedDiners.length }})
												</span>
											</div>
										</td>
										<td class="px-4 py-2 border-b border-default text-right">
											<USwitch
												:model-value="
													ungroupedDiners.every((d) => isAssigned(d.id))
												"
												:disabled="ungroupedDiners.length === 0"
												size="sm"
												@update:model-value="toggleUngrouped()"
											/>
										</td>
									</tr>
									<tr
										v-for="diner in ungroupedDiners"
										:key="diner.id"
										class="border-b border-default hover:bg-elevated/30 transition-colors"
										:class="{ 'opacity-50': !isAssigned(diner.id) }"
									>
										<td class="px-4 py-2.5">
											<span class="text-highlighted">
												{{ diner.last_name }} {{ diner.first_name }}
											</span>
										</td>
										<td class="px-4 py-2.5 text-right">
											<USwitch
												:model-value="isAssigned(diner.id)"
												:loading="pendingDiners.has(diner.id)"
												size="sm"
												@update:model-value="toggleDiner(diner.id)"
											/>
										</td>
									</tr>
								</template>
							</tbody>
						</table>
					</div>
				</template>
			</div>
		</template>
	</UDashboardPanel>
</template>
