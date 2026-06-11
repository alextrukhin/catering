<script setup lang="ts">
import { useMiniApp } from "vue-tg";
import { startRegistration } from "@simplewebauthn/browser";

definePageMeta({ layout: "guardian" });

const { $client, $guardian } = useNuxtApp();
const { t, locale } = useI18n();
const toast = useToast();
const webApp = useMiniApp();

const isInTelegram = computed(() => !!webApp.initData);
const me = computed(() => $guardian.user.value);

const { data: linkedDiners, pending: dinersPending } = await useAsyncData(
	"guardian-diners",
	() => $client.guardian.diners.list.query(),
	{ lazy: true }
);

const selectedDinerId = ref<number | undefined>(undefined);

watch(
	linkedDiners,
	(val) => {
		if (val && val.length > 0 && !selectedDinerId.value) {
			selectedDinerId.value = val[0]!.Diner.id;
		}
	},
	{ immediate: true }
);

const selectedDiner = computed(
	() =>
		linkedDiners.value?.find((d) => d.Diner.id === selectedDinerId.value)?.Diner
);

const today = new Date();
const calYear = ref(today.getFullYear());
const calMonth = ref(today.getMonth() + 1);

const {
	data: calendarDays,
	refresh: refreshCalendar,
	pending: calPending,
} = $client.guardian.diners.calendarDays.useQuery(
	computed(() => ({
		diner_id: selectedDinerId.value ?? 0,
		year: calYear.value,
		month: calMonth.value,
	})),
	{ lazy: true, immediate: false, watch: [selectedDinerId, calYear, calMonth] }
);

const planDayMap = computed(() => {
	const map = new Map<
		string,
		{ id: number; is_complete: boolean; selected_courses: number }
	>();
	for (const d of calendarDays.value ?? []) {
		map.set(new Date(d.date).toISOString().slice(0, 10), {
			id: d.id,
			is_complete: d.is_complete,
			selected_courses: d.selected_courses,
		});
	}
	return map;
});

const activeDates = computed(() => new Set(planDayMap.value.keys()));

const dinerItems = computed(
	() =>
		linkedDiners.value?.map((gd) => ({
			value: gd.Diner.id,
			label: `${gd.Diner.first_name} ${gd.Diner.last_name}`,
		})) ?? []
);

const dateLocale = computed(() => (locale.value === "uk" ? "uk-UA" : "en-GB"));

function formatDay(date: Date | string): string {
	return new Intl.DateTimeFormat(dateLocale.value, {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(date as string));
}

const passkeyModalOpen = ref(false);
const dishInfoOpen = ref(false);
const dishInfoItem = ref<CourseView["options"][number] | null>(null);
function openDishInfo(opt: CourseView["options"][number]) {
	dishInfoItem.value = opt;
	dishInfoOpen.value = true;
}
const passkeyName = ref("");
const passkeyBusy = ref(false);

async function addPasskey() {
	passkeyBusy.value = true;
	try {
		const { options, challenge_id } =
			await $client.guardian.user.startPasskeyRegistration.mutate();
		const response = await startRegistration({ optionsJSON: options });
		await $client.guardian.user.verifyPasskeyRegistration.mutate({
			challenge_id,
			name: passkeyName.value || t("dashboard.passkey_name_placeholder"),
			response,
		});
		toast.add({ title: t("dashboard.passkey_success"), color: "success" });
		passkeyModalOpen.value = false;
		passkeyName.value = "";
	} catch (ex) {
		console.error(ex);
		toast.add({ title: t("dashboard.passkey_failed"), color: "error" });
	} finally {
		passkeyBusy.value = false;
	}
}

type CourseView = {
	plan_course_id: number;
	label: string;
	options: {
		id: number;
		name: string;
		price: number | null;
		weight: number | null;
		ingredients: string[];
		notes: string | null;
		dish_id: number;
		photo_id: number | null;
	}[];
	selected_option_id: number | null;
	dish_selection_id: number | null;
};

type MealView = {
	plan_meal_id: number;
	label: string;
	courses: CourseView[];
};

function getCurrentPrice(
	prices: Array<{ price: number; valid_from: Date; valid_to: Date | null }>
): number | null {
	const now = new Date();
	const p = prices.find(
		(x) =>
			new Date(x.valid_from) <= now &&
			(!x.valid_to || new Date(x.valid_to) >= now)
	);
	return p?.price ?? null;
}

const expandedId = ref<number | undefined>(undefined);

watch([calYear, calMonth, selectedDinerId], () => {
	expandedId.value = undefined;
});

const {
	data: dayData,
	refresh: refreshDay,
	pending: dayPending,
} = $client.guardian.diners.dinerDay.useQuery(
	computed(() => ({
		plan_day_diner_id: expandedId.value ?? 0,
		diner_id: selectedDinerId.value ?? 0,
	})),
	{ lazy: true, immediate: false, watch: false }
);

watch(expandedId, (id) => {
	if (id !== undefined) refreshDay();
});

function toggleExpand(id: number) {
	expandedId.value = expandedId.value === id ? undefined : id;
}

const mealsView = computed<MealView[]>(() => {
	const d = dayData.value;
	if (!d) return [];
	const selMap = new Map(d.DishSelections.map((s) => [s.plan_course_id, s]));
	return d.PlanDay.MealPlan.Meals.map((planMeal) => ({
		plan_meal_id: planMeal.id,
		label: planMeal.Meal[`label_${locale.value}`] || planMeal.Meal.label_uk,
		courses: planMeal.Courses.map((planCourse) => {
			const sel = selMap.get(planCourse.id) ?? null;
			return {
				plan_course_id: planCourse.id,
				label:
					planCourse.Course[`label_${locale.value}`] ||
					planCourse.Course.label_uk,
				options: planCourse.Course.Options.map((o) => ({
					id: o.id,
					name: o.Dish[`name_${locale.value}`] || o.Dish.name_uk,
					price: getCurrentPrice(o.Dish.Prices),
					weight: o.Dish.weight ?? null,
					ingredients: o.Dish.ingredients ?? [],
					notes: o.Dish.notes ?? null,
					dish_id: o.dish_id,
					photo_id: o.Dish.photo_id ?? null,
				})),
				selected_option_id: sel?.course_option_id ?? null,
				dish_selection_id: sel?.id ?? null,
			};
		}),
	}));
});

const dayTotal = computed(() => {
	if (!dayData.value) return null;
	const selMap = new Map(
		dayData.value.DishSelections.map((s) => [s.plan_course_id, s])
	);
	let total = 0;
	for (const pm of dayData.value.PlanDay.MealPlan.Meals) {
		for (const pc of pm.Courses) {
			const sel = selMap.get(pc.id);
			if (!sel) continue;
			const opt = pc.Course.Options.find((o) => o.id === sel.course_option_id);
			if (!opt) continue;
			const price = getCurrentPrice(opt.Dish.Prices);
			if (price !== null) total += price;
		}
	}
	return total > 0 ? total : null;
});

const busy = ref(false);

async function onCourseOptionSelect(
	course: CourseView,
	optionId: number | null
) {
	if (busy.value || !dayData.value || !selectedDinerId.value) return;
	busy.value = true;
	try {
		await $client.guardian.diners.setDish.mutate({
			plan_day_diner_id: dayData.value.id,
			diner_id: selectedDinerId.value,
			plan_course_id: course.plan_course_id,
			course_option_id: optionId,
		});
		await Promise.all([refreshDay(), refreshCalendar()]);
	} catch {
		toast.add({ title: t("dashboard.selection_error"), color: "error" });
	} finally {
		busy.value = false;
	}
}

const copyModalOpen = ref(false);
const copySourceId = ref<number | undefined>(undefined);
const copyTargetIds = ref<number[]>([]);
const copyBusy = ref(false);

const copyTargetOptions = computed(() =>
	(calendarDays.value ?? [])
		.filter((d) => d.id !== copySourceId.value)
		.map((d) => ({ id: d.id, label: formatDay(d.date) }))
);

function openCopyModal(id: number) {
	copySourceId.value = id;
	copyTargetIds.value = [];
	copyModalOpen.value = true;
}

function toggleTarget(id: number) {
	const idx = copyTargetIds.value.indexOf(id);
	if (idx === -1) copyTargetIds.value.push(id);
	else copyTargetIds.value.splice(idx, 1);
}

async function executeCopy() {
	if (
		!copySourceId.value ||
		copyTargetIds.value.length === 0 ||
		!selectedDinerId.value
	)
		return;
	copyBusy.value = true;
	try {
		const result = await $client.guardian.diners.copyDay.mutate({
			diner_id: selectedDinerId.value,
			source_id: copySourceId.value,
			target_ids: copyTargetIds.value,
		});
		toast.add({
			title: t("dashboard.copy_day_success", { count: result.copied }),
			color: "success",
		});
		copyModalOpen.value = false;
	} catch {
		toast.add({ title: t("dashboard.copy_day_failed"), color: "error" });
	} finally {
		copyBusy.value = false;
	}
}
</script>

<template>
	<div class="max-w-3xl mx-auto px-4 py-8 space-y-8">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold text-highlighted">
					{{ $t("dashboard.greeting", { name: me?.first_name ?? "…" }) }}
				</h1>
				<p class="text-sm text-muted mt-1">
					{{ $t("dashboard.subtitle_guardian") }}
				</p>
			</div>
			<UButton
				v-if="!isInTelegram"
				variant="ghost"
				size="sm"
				icon="i-lucide-key-round"
				:label="$t('dashboard.add_passkey')"
				class="shrink-0 mt-1"
				@click="passkeyModalOpen = true"
			/>
		</div>

		<div
			v-if="!dinersPending && (linkedDiners?.length ?? 0) === 0"
			class="text-center py-12 text-muted text-sm"
		>
			{{ $t("dashboard.no_diners") }}
		</div>

		<template v-else>
			<div
				v-if="(linkedDiners?.length ?? 0) > 1"
				class="flex items-center gap-3"
			>
				<span class="text-sm text-muted shrink-0">
					{{ $t("dashboard.viewing") }}
				</span>
				<USelect
					v-model="selectedDinerId"
					:items="dinerItems"
					value-key="value"
					option-attribute="label"
					class="w-60"
				/>
			</div>

			<UCard :ui="{ body: 'p-4 sm:p-6' }">
				<div class="flex items-center gap-2 mb-4">
					<UIcon name="i-lucide-user" class="size-4 text-muted" />
					<span class="text-sm font-medium text-highlighted">
						{{
							selectedDiner
								? `${selectedDiner.first_name} ${selectedDiner.last_name}`
								: "…"
						}}
					</span>
				</div>

				<MealCalendar
					v-model:year="calYear"
					v-model:month="calMonth"
					:active-dates="activeDates"
				>
					<template #day-extra="{ day }">
						<template v-if="planDayMap.get(day.key)">
							<div
								class="mt-0.5 size-1.5 rounded-full"
								:class="
									planDayMap.get(day.key)!.is_complete
										? 'bg-green-500'
										: 'bg-red-400'
								"
							/>
						</template>
						<div v-else class="mt-0.5 size-1.5" />
					</template>
				</MealCalendar>

				<div
					class="flex items-center gap-4 mt-4 pt-3 border-t border-default text-xs text-muted"
				>
					<div class="flex items-center gap-1.5">
						<span class="size-2 rounded-full bg-green-500 inline-block" />
						{{ $t("dashboard.all_selected") }}
					</div>
					<div class="flex items-center gap-1.5">
						<span class="size-2 rounded-full bg-red-400 inline-block" />
						{{ $t("dashboard.selections_pending") }}
					</div>
				</div>
			</UCard>

			<div v-if="(calendarDays?.length ?? 0) > 0" class="space-y-2">
				<h2 class="text-xs font-semibold text-muted uppercase tracking-wider">
					{{ $t("dashboard.this_month") }}
				</h2>
				<div class="space-y-1">
					<div
						v-for="d in calendarDays"
						:key="d.id"
						class="rounded-lg border border-default overflow-hidden"
					>
						<button
							class="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-elevated/30 transition-colors"
							@click="toggleExpand(d.id)"
						>
							<div class="min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-medium text-highlighted">
										{{ formatDay(d.date) }}
									</span>
									<span class="text-muted">
										{{ locale === "uk" ? d.plan_label_uk : d.plan_label_en }}
									</span>
								</div>
								<p
									v-if="d.dish_names.length > 0"
									class="text-xs text-muted/70 mt-0.5 truncate"
								>
									{{ d.dish_names.join(", ") }}
								</p>
							</div>
							<div class="flex items-center gap-2 shrink-0 ml-2">
								<span
									class="text-xs px-2 py-0.5 rounded-full font-medium"
									:class="
										d.is_complete
											? 'bg-green-500/10 text-green-600 dark:text-green-400'
											: 'bg-red-400/10 text-red-500 dark:text-red-400'
									"
								>
									{{
										d.is_complete
											? $t("dashboard.complete")
											: `${d.selected_courses}/${d.total_courses}`
									}}
								</span>
								<UIcon
									name="i-lucide-chevron-down"
									class="size-4 text-muted transition-transform duration-200"
									:class="{ 'rotate-180': expandedId === d.id }"
								/>
							</div>
						</button>

						<div v-if="expandedId === d.id" class="border-t border-default">
							<div
								class="p-4 space-y-4 transition-opacity duration-150"
								:class="{
									'opacity-50 pointer-events-none': dayPending || busy,
								}"
							>
								<template v-if="dayData">
									<div class="flex items-center justify-between">
										<span
											v-if="dayTotal !== null"
											class="text-sm font-semibold text-highlighted"
										>
											{{
												$t("dashboard.day_total", {
													total: dayTotal.toFixed(2),
												})
											}}
										</span>
										<span v-else />
										<UButton
											variant="ghost"
											size="xs"
											icon="i-lucide-copy"
											:label="$t('dashboard.copy_day')"
											@click="openCopyModal(d.id)"
										/>
									</div>

									<div
										v-for="meal in mealsView"
										:key="meal.plan_meal_id"
										class="rounded-xl border border-default overflow-hidden"
									>
										<div class="px-4 py-2 bg-elevated/40 font-medium text-sm">
											{{ meal.label }}
										</div>
										<div class="divide-y divide-default">
											<div
												v-for="course in meal.courses"
												:key="course.plan_course_id"
												class="px-4 py-3 space-y-1.5"
											>
												<span class="text-sm text-muted">
													{{ course.label }}
												</span>
												<div
													v-if="course.options.length > 0"
													class="grid grid-cols-2 gap-2 mt-1.5"
												>
													<div
														v-for="opt in course.options"
														:key="opt.id"
														class="relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden"
														:class="
															course.selected_option_id === opt.id
																? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
																: 'border-default hover:border-primary-300'
														"
														@click="onCourseOptionSelect(course, opt.id)"
													>
														<img
															v-if="opt.photo_id"
															:src="`/api/dishes/${opt.dish_id}/photo`"
															class="w-full h-20 object-cover"
														/>
														<div
															v-else
															class="w-full h-20 bg-elevated flex items-center justify-center"
														>
															<UIcon
																name="i-lucide-utensils"
																class="size-6 text-muted"
															/>
														</div>
														<div class="p-2">
															<p
																class="text-xs font-medium text-highlighted leading-tight"
															>
																{{ opt.name }}
															</p>
															<p
																v-if="opt.price !== null"
																class="text-xs text-primary-600 dark:text-primary-400 font-semibold mt-0.5"
															>
																₴{{ opt.price.toFixed(2) }}
															</p>
															<p v-if="opt.weight" class="text-xs text-muted">
																{{ opt.weight }} {{ t("g") }}
															</p>
														</div>
														<UButton
															size="xs"
															variant="ghost"
															icon="i-lucide-info"
															class="absolute top-1 right-1 size-6! p-0! bg-black/30 text-white hover:bg-black/50"
															@click.stop="openDishInfo(opt)"
														/>
														<div
															v-if="course.selected_option_id === opt.id"
															class="absolute top-1 left-1"
														>
															<UIcon
																name="i-lucide-check-circle"
																class="size-5 text-primary-500"
															/>
														</div>
													</div>
													<div
														class="relative rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center h-full min-h-15"
														:class="
															course.selected_option_id === null
																? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
																: 'border-default hover:border-primary-300'
														"
														@click="onCourseOptionSelect(course, null)"
													>
														<span class="text-xs text-muted">
															{{ $t("dashboard.no_selection") }}
														</span>
													</div>
												</div>
												<p v-else class="text-xs text-muted">
													{{ $t("dashboard.no_dish_choices") }}
												</p>
											</div>
										</div>
									</div>
								</template>
								<template v-else>
									<div class="animate-pulse space-y-3">
										<div
											class="rounded-xl border border-default overflow-hidden"
										>
											<div class="px-4 py-2 bg-elevated/40 h-9" />
											<div class="px-4 py-3 space-y-2">
												<div class="h-4 bg-elevated rounded w-24" />
												<div class="grid grid-cols-2 gap-2">
													<div class="h-28 bg-elevated rounded-lg" />
													<div class="h-28 bg-elevated rounded-lg" />
													<div class="h-28 bg-elevated rounded-lg" />
												</div>
											</div>
										</div>
									</div>
								</template>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div v-else-if="calPending" class="flex justify-center py-8">
				<UIcon
					name="i-lucide-loader-circle"
					class="size-6 animate-spin text-muted"
				/>
			</div>

			<p
				v-else-if="selectedDinerId"
				class="text-sm text-center text-muted py-6"
			>
				{{ $t("dashboard.no_days") }}
			</p>
		</template>
	</div>

	<UModal v-model:open="passkeyModalOpen" :title="$t('dashboard.add_passkey')">
		<template #body>
			<div class="p-4 space-y-4">
				<UFormField :label="$t('dashboard.passkey_name')">
					<UInput
						v-model="passkeyName"
						:placeholder="$t('dashboard.passkey_name_placeholder')"
					/>
				</UFormField>
			</div>
		</template>
		<template #footer>
			<div class="flex justify-end">
				<UButton
					:label="$t('dashboard.passkey_save')"
					:loading="passkeyBusy"
					@click="addPasskey"
				/>
			</div>
		</template>
	</UModal>

	<UModal v-model:open="copyModalOpen" :title="$t('dashboard.copy_day_title')">
		<template #body>
			<div class="p-4 space-y-3">
				<div
					v-for="opt in copyTargetOptions"
					:key="opt.id"
					class="flex items-center gap-3"
				>
					<UCheckbox
						:model-value="copyTargetIds.includes(opt.id)"
						:label="opt.label"
						@update:model-value="toggleTarget(opt.id)"
					/>
				</div>
				<p v-if="copyTargetOptions.length === 0" class="text-sm text-muted">
					{{ $t("dashboard.no_days") }}
				</p>
			</div>
		</template>
		<template #footer>
			<div class="flex justify-end">
				<UButton
					:label="$t('dashboard.copy_day_confirm')"
					:loading="copyBusy"
					:disabled="copyTargetIds.length === 0"
					@click="executeCopy"
				/>
			</div>
		</template>
	</UModal>

	<UModal v-model:open="dishInfoOpen" :title="dishInfoItem?.name ?? ''">
		<template #body>
			<div class="p-4 space-y-3">
				<img
					v-if="dishInfoItem?.photo_id"
					:src="`/api/dishes/${dishInfoItem.dish_id}/photo`"
					class="w-full rounded-lg object-cover max-h-48"
				/>
				<div v-if="dishInfoItem?.weight" class="flex gap-2 text-sm">
					<span class="font-medium">{{ $t("dashboard.weight") }}:</span>
					<span class="text-muted">{{ dishInfoItem.weight }} {{ t("g") }}</span>
				</div>
				<div v-if="dishInfoItem?.price !== null" class="flex gap-2 text-sm">
					<span class="font-medium">{{ $t("dashboard.price") }}:</span>
					<span class="text-primary-600 dark:text-primary-400 font-semibold">
						₴{{ dishInfoItem?.price?.toFixed(2) }}
					</span>
				</div>
				<div v-if="dishInfoItem?.ingredients?.length" class="text-sm">
					<p class="font-medium mb-1">{{ $t("dashboard.ingredients") }}:</p>
					<ul class="list-disc list-inside text-muted space-y-0.5">
						<li v-for="ing in dishInfoItem.ingredients" :key="ing">
							{{ ing }}
						</li>
					</ul>
				</div>
				<div v-if="dishInfoItem?.notes" class="text-sm">
					<p class="font-medium mb-1">{{ $t("dashboard.notes") }}:</p>
					<p class="text-muted">{{ dishInfoItem.notes }}</p>
				</div>
			</div>
		</template>
	</UModal>
</template>
