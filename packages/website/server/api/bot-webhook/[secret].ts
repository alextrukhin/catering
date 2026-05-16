import { Bot, webhookCallback } from "grammy";
import { readClient, writeClient } from "prismaclient";

const APP_URL = process.env.ORIGIN ?? "http://localhost:3000";

async function saveTelegramLang(
	orgId: number,
	telegramId: bigint,
	lang: string | undefined
) {
	if (!lang) return;
	await Promise.allSettled([
		writeClient.diner.updateMany({
			where: { organization_id: orgId, telegram_id: telegramId },
			data: { telegram_lang: lang },
		}),
		writeClient.guardian.updateMany({
			where: { organization_id: orgId, telegram_id: telegramId },
			data: { telegram_lang: lang },
		}),
	]);
}

export default defineEventHandler(async (event) => {
	const secret = getRouterParam(event, "secret");
	if (!secret) throw createError({ statusCode: 404 });

	const org = await readClient.organization.findFirst({
		where: { bot_webhook_secret: secret },
		select: { id: true, bot_token: true, name_uk: true },
	});

	if (!org?.bot_token) throw createError({ statusCode: 404 });

	const bot = new Bot(org.bot_token);

	bot.command("link_diner", async (ctx) => {
		if (ctx.from?.id) {
			await saveTelegramLang(
				org.id,
				BigInt(ctx.from.id),
				ctx.from.language_code
			);
		}
		await ctx.reply("Натисніть кнопку, щоб увійти та прив'язати акаунт:", {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "Відкрити застосунок учня",
							web_app: { url: `${APP_URL}/diner/signin?org_id=${org.id}` },
						},
					],
				],
			},
		});
	});

	bot.command("link_guardian", async (ctx) => {
		if (ctx.from?.id) {
			await saveTelegramLang(
				org.id,
				BigInt(ctx.from.id),
				ctx.from.language_code
			);
		}
		await ctx.reply("Натисніть кнопку, щоб увійти та прив'язати акаунт:", {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "Відкрити застосунок батьків",
							web_app: {
								url: `${APP_URL}/guardian/signin?org_id=${org.id}`,
							},
						},
					],
				],
			},
		});
	});

	const handle = webhookCallback(bot, "http");
	return handle(event.node.req, event.node.res);
});
