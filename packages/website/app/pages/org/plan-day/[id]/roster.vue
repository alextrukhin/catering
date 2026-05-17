<script setup lang="ts">
definePageMeta({ layout: "org" });

const route = useRoute();
const { $client } = useNuxtApp();
const toast = useToast();
const { locale } = useI18n();

const dayId = computed(() => Number(route.params.id));

const { data, pending } = $client.org.mealPlans.getDayRoster.useQuery(
	computed(() => ({ id: dayId.value })),
	{ lazy: true }
);

const assigned = reactive<Record<number, number | undefined>>({});

watch(
	data,
	(d) => {
		if (!d) return;
		// Reset to server state
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
	if (!data.value) return new Set<number>();
	return new Set(
		data.value.groups.flatMap((g) => g.Members.map((m) => m.Diner.id))
	);
});

const ungroupedDiners = computed(() => {
	if (!data.value) return [];
	return data.value.allDiners.filter((d) => !groupedDinerIds.value.has(d.id));
});

// Extra groups a diner belongs to beyond their first (for badge display)
const dinerExtraGroups = computed(() => {
	if (!data.value) return new Map<number, string[]>();
	const map = new Map<number, string[]>();
	for (const g of data.value.groups) {
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

type Group = NonNullable<typeof data.value>["groups"][number];

const groupAllAssigned = (group: Group) =>
	group.Members.length > 0 &&
	group.Members.every((m) => isAssigned(m.Diner.id));

const pendingDiners = reactive(new Set<number>());

async function toggleDiner(dinerId: number) {
	if (pendingDiners.has(dinerId)) return;
	pendingDiners.add(dinerId);

	const prevId = assigned[dinerId];

	// Optimistic update
	if (prevId !== undefined) {
		delete assigned[dinerId];
	} else {
		assigned[dinerId] = -1; // placeholder until server returns real id
	}

	try {
		if (prevId !== undefined) {
			await $client.org.mealPlans.removeDiner.mutate({ id: prevId });
		} else {
			const result = await $client.org.mealPlans.addDiner.mutate({
				plan_day_id: dayId.value,
				diner_id: dinerId,
			});
			assigned[dinerId] = result.id;
		}
	} catch {
		// Revert
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
	if (!data.value) return 0;
	return data.value.allDiners.filter((d) => isAssigned(d.id)).length;
});

const totalDiners = computed(() => data.value?.allDiners.length ?? 0);

const dateLabel = computed(() =>
	data.value
		? new Intl.DateTimeFormat("uk-UA", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
				timeZone: "UTC",
			}).format(new Date(data.value.day.date as string))
		: ""
);
</script>

<template>
	<UDashboardPanel id="plan-day-roster">
		<template #header>
			<UDashboardNavbar>
				<template #leading>
					<UDashboardSidebarCollapse />
					<UButton
						variant="ghost"
						size="sm"
						icon="i-lucide-arrow-left"
						:to="`/org/plan-day/${dayId}`"
						class="ml-1"
					/>
				</template>
				<template #title>
					<div v-if="data" class="flex flex-col leading-tight">
						<span class="font-semibold capitalize">{{ dateLabel }}</span>
						<span class="text-xs text-muted font-normal">
							{{
								data.day.MealPlan[`label_${locale}`] ||
								data.day.MealPlan.label_uk
							}}
							&mdash; manage diners
						</span>
					</div>
					<span v-else class="text-muted">Loading...</span>
				</template>
				<template #right>
					<div
						v-if="data"
						class="flex items-center gap-3 text-sm text-muted pr-2"
					>
						<span>
							<span class="font-semibold text-highlighted">
								{{ assignedCount }}
							</span>
							/{{ totalDiners }} assigned
						</span>
						<UButton
							variant="soft"
							size="xs"
							icon="i-lucide-table-2"
							label="Stats"
							:to="`/org/plan-day/${dayId}`"
						/>
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
				v-else-if="!data"
				class="flex justify-center items-center h-40 text-muted text-sm"
			>
				Day not found.
			</div>

			<div
				v-else-if="data.allDiners.length === 0"
				class="flex justify-center items-center h-40 text-muted text-sm"
			>
				No diners in this organisation yet.
			</div>

			<div v-else class="overflow-x-auto">
				<table class="w-full text-sm border-collapse">
					<thead class="sticky top-0 z-10">
						<tr>
							<th
								class="sticky left-0 z-20 text-left px-4 py-2.5 font-medium text-muted bg-background border-b border-default"
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
						<template v-for="group in data.groups" :key="group.id">
							<tr class="bg-elevated/60">
								<td
									class="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-default"
								>
									<div class="flex items-center gap-1.5">
										<UIcon
											name="i-lucide-users-round"
											class="size-3.5 shrink-0"
										/>
										{{ group.name_uk }}
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
										{{ member.Diner.last_name }} {{ member.Diner.first_name }}
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
								<td class="px-4 py-2.5 pl-9">
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
	</UDashboardPanel>
</template>
