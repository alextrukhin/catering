<script setup lang="ts">
export interface DayCell {
	date: Date;
	day: number;
	isCurrentMonth: boolean;
	isToday: boolean;
	key: string; // "YYYY-MM-DD" in UTC
}

const props = defineProps<{
	year: number;
	month: number; // 1-12
	activeDates?: Set<string>;
}>();

const emit = defineEmits<{
	"update:year": [number];
	"update:month": [number];
	"day-click": [DayCell];
}>();

const { locale } = useI18n();

const dateLocale = computed(() => (locale.value === "uk" ? "uk-UA" : "en-GB"));

const weekdays = computed(() => {
	const fmt = new Intl.DateTimeFormat(dateLocale.value, {
		weekday: "short",
		timeZone: "UTC",
	});
	return Array.from({ length: 7 }, (_, i) =>
		fmt.format(new Date(Date.UTC(2025, 5, 2 + i)))
	);
});

const monthLabel = computed(() =>
	new Intl.DateTimeFormat(dateLocale.value, {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(props.year, props.month - 1, 1)))
);

const t = new Date();
const todayKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

const grid = computed<DayCell[]>(() => {
	const cells: DayCell[] = [];

	const firstDay = new Date(Date.UTC(props.year, props.month - 1, 1));
	const startPad = (firstDay.getUTCDay() + 6) % 7;

	for (let i = startPad - 1; i >= 0; i--) {
		const d = new Date(Date.UTC(props.year, props.month - 1, -i));
		const key = d.toISOString().slice(0, 10);
		cells.push({
			date: d,
			day: d.getUTCDate(),
			isCurrentMonth: false,
			isToday: false,
			key,
		});
	}

	const daysInMonth = new Date(
		Date.UTC(props.year, props.month, 0)
	).getUTCDate();
	for (let d = 1; d <= daysInMonth; d++) {
		const date = new Date(Date.UTC(props.year, props.month - 1, d));
		const key = date.toISOString().slice(0, 10);
		cells.push({
			date,
			day: d,
			isCurrentMonth: true,
			isToday: key === todayKey,
			key,
		});
	}

	const remaining = 42 - cells.length;
	for (let d = 1; d <= remaining; d++) {
		const date = new Date(Date.UTC(props.year, props.month, d));
		const key = date.toISOString().slice(0, 10);
		cells.push({ date, day: d, isCurrentMonth: false, isToday: false, key });
	}

	return cells;
});

function prevMonth() {
	if (props.month === 1) {
		emit("update:year", props.year - 1);
		emit("update:month", 12);
	} else {
		emit("update:month", props.month - 1);
	}
}

function nextMonth() {
	if (props.month === 12) {
		emit("update:year", props.year + 1);
		emit("update:month", 1);
	} else {
		emit("update:month", props.month + 1);
	}
}
</script>

<template>
	<div class="select-none">
		<div class="flex items-center justify-between mb-4">
			<UButton
				variant="ghost"
				size="sm"
				icon="i-lucide-chevron-left"
				aria-label="Previous month"
				@click="prevMonth"
			/>
			<span class="font-semibold text-sm text-highlighted capitalize">
				{{ monthLabel }}
			</span>
			<UButton
				variant="ghost"
				size="sm"
				icon="i-lucide-chevron-right"
				aria-label="Next month"
				@click="nextMonth"
			/>
		</div>

		<div class="grid grid-cols-7 mb-1">
			<div
				v-for="d in weekdays"
				:key="d"
				class="text-center text-xs font-medium text-muted py-1"
			>
				{{ d }}
			</div>
		</div>

		<div class="grid grid-cols-7">
			<div
				v-for="cell in grid"
				:key="cell.key"
				class="flex flex-col items-center pb-1"
				:class="
					activeDates?.has(cell.key) ? 'cursor-pointer' : 'cursor-default'
				"
				@click="emit('day-click', cell)"
			>
				<span
					class="w-8 h-8 flex items-center justify-center rounded-full text-sm leading-none transition-colors"
					:class="
						cell.isToday
							? 'bg-primary text-white font-bold'
							: cell.isCurrentMonth
								? 'text-foreground hover:bg-muted/40'
								: 'text-muted/40'
					"
				>
					{{ cell.day }}
				</span>
				<slot name="day-extra" :day="cell" />
			</div>
		</div>
	</div>
</template>
