import { readClient } from "prismaclient";
import { Bot } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import pLimit from "p-limit";
import { t } from "./i18n.ts";

const TICK_MS = 60_000;
const MSG_PER_SECOND = 29;

const db = readClient;
const APP_URL = process.env.ORIGIN ?? "http://localhost:3000";

function nowUtcHHMM(): string {
	const d = new Date();
	return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function todayUtc(): Date {
	const d = new Date();
	return new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
	);
}

type DishSelection = {
	PlanCourse: { Course: { label_uk: string; label_en: string } };
	CourseOption: { Dish: { name_uk: string; name_en: string } };
};

function formatSelections(
	selections: DishSelection[],
	lang: string | null | undefined
): string {
	if (selections.length === 0) return t(lang, "no_selection");
	const isUk = (lang ?? "uk") === "uk";
	return selections
		.map((s) =>
			t(lang, "course_line", {
				course: isUk
					? s.PlanCourse.Course.label_uk
					: s.PlanCourse.Course.label_en,
				dish: isUk ? s.CourseOption.Dish.name_uk : s.CourseOption.Dish.name_en,
			})
		)
		.join("\n");
}

async function tick(time: string) {
	const orgs = await db.organization.findMany({
		where: { notification_time: time, bot_token: { not: null } },
		select: { id: true, bot_token: true },
	});

	const today = todayUtc();

	for (const org of orgs) {
		if (!org.bot_token) continue;

		const bot = new Bot(org.bot_token);
		bot.api.config.use(
			autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 120 })
		);
		const limit = pLimit(MSG_PER_SECOND);

		const planDayDiners = await db.planDayDiner.findMany({
			where: {
				PlanDay: {
					date: today,
					MealPlan: { organization_id: org.id },
				},
			},
			select: {
				diner_id: true,
				DishSelections: {
					select: {
						PlanCourse: {
							select: {
								Course: { select: { label_uk: true, label_en: true } },
							},
						},
						CourseOption: {
							select: {
								Dish: { select: { name_uk: true, name_en: true } },
							},
						},
					},
				},
			},
		});

		const selectionsByDiner = new Map(
			planDayDiners.map((pdd) => [pdd.diner_id, pdd.DishSelections])
		);

		const diners = await db.diner.findMany({
			where: { organization_id: org.id, telegram_id: { not: null } },
			select: {
				id: true,
				telegram_id: true,
				first_name: true,
				telegram_lang: true,
			},
		});

		const guardians = await db.guardian.findMany({
			where: { organization_id: org.id, telegram_id: { not: null } },
			select: {
				id: true,
				telegram_id: true,
				first_name: true,
				telegram_lang: true,
				Diners: {
					select: {
						Diner: {
							select: { id: true, first_name: true, last_name: true },
						},
					},
				},
			},
		});

		const dinerTasks = diners
			.filter((d) => d.telegram_id != null)
			.map((d) =>
				limit(async () => {
					const selections = selectionsByDiner.get(d.id) ?? [];
					const text = [
						t(d.telegram_lang, "greeting", { name: d.first_name }),
						t(d.telegram_lang, "diner_header"),
						formatSelections(selections, d.telegram_lang),
					].join("\n");
					try {
						await bot.api.sendMessage(Number(d.telegram_id), text, {
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: t(d.telegram_lang, "btn_diner"),
											web_app: { url: `${APP_URL}/diner/dashboard` },
										},
									],
								],
							},
						});
					} catch {}
				})
			);

		const guardianTasks = guardians
			.filter((g) => g.telegram_id != null)
			.map((g) =>
				limit(async () => {
					const childLines = g.Diners.map(({ Diner: child }) => {
						const sel = selectionsByDiner.get(child.id) ?? [];
						return (
							t(g.telegram_lang, "child_name", {
								firstName: child.first_name,
								lastName: child.last_name,
							}) +
							"\n" +
							formatSelections(sel, g.telegram_lang)
						);
					}).join("\n\n");

					const text = [
						t(g.telegram_lang, "greeting", { name: g.first_name }),
						t(g.telegram_lang, "guardian_header"),
						childLines || t(g.telegram_lang, "no_selection"),
					].join("\n");

					try {
						await bot.api.sendMessage(Number(g.telegram_id), text, {
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: t(g.telegram_lang, "btn_guardian"),
											web_app: { url: `${APP_URL}/guardian/dashboard` },
										},
									],
								],
							},
						});
					} catch {}
				})
			);

		await Promise.all([...dinerTasks, ...guardianTasks]);
	}
}

console.log("[cron] Started");

const msToNextMinute = TICK_MS - (Date.now() % TICK_MS) + 200;
setTimeout(() => {
	const time = nowUtcHHMM();
	console.log(`[cron] Tick ${time}`);
	tick(time).catch(console.error);

	setInterval(() => {
		const time = nowUtcHHMM();
		console.log(`[cron] Tick ${time}`);
		tick(time).catch(console.error);
	}, TICK_MS);
}, msToNextMinute);
