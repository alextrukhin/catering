import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { orgStaffProcedure, router } from "../../trpc";
import { z } from "zod";
import { randomBytes, bytesToHex } from "@noble/hashes/utils.js";
import { Bot } from "grammy";

const APP_URL = process.env.ORIGIN ?? "http://localhost:3000";

export default router({
	get: orgStaffProcedure.query(async ({ ctx: { orgStaff } }) => {
		const org = await readClient.organization.findUniqueOrThrow({
			where: { id: orgStaff!.organization_id },
			select: {
				bot_token: true,
				bot_webhook_secret: true,
				notification_time: true,
			},
		});
		return {
			// Mask the token — return only bot_id prefix for display
			bot_configured: !!org.bot_token,
			bot_id: org.bot_token ? org.bot_token.split(":")[0] : null,
			notification_time: org.notification_time,
		};
	}),

	setupBot: orgStaffProcedure
		.input(
			z.object({
				bot_token: z.string().min(20),
				notification_time: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.optional(),
			})
		)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			// Verify token is valid by calling getMe
			const bot = new Bot(input.bot_token);
			try {
				await bot.api.getMe();
			} catch {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid bot token",
				});
			}

			const webhookSecret = bytesToHex(randomBytes(32));
			const webhookUrl = `${APP_URL}/api/bot-webhook/${webhookSecret}`;

			// Set webhook
			await bot.api.setWebhook(webhookUrl, { secret_token: webhookSecret });

			// Set commands
			await bot.api.setMyCommands([
				{ command: "link_diner", description: "Прив'язати акаунт учня" },
				{ command: "link_guardian", description: "Прив'язати акаунт батьків" },
			]);

			await writeClient.organization.update({
				where: { id: orgStaff!.organization_id },
				data: {
					bot_token: input.bot_token,
					bot_webhook_secret: webhookSecret,
					notification_time: input.notification_time ?? null,
				},
			});

			return { ok: true };
		}),

	removeBot: orgStaffProcedure.mutation(async ({ ctx: { orgStaff } }) => {
		const org = await readClient.organization.findUnique({
			where: { id: orgStaff!.organization_id },
			select: { bot_token: true },
		});
		if (org?.bot_token) {
			try {
				const bot = new Bot(org.bot_token);
				await bot.api.deleteWebhook();
			} catch {}
		}
		await writeClient.organization.update({
			where: { id: orgStaff!.organization_id },
			data: {
				bot_token: null,
				bot_webhook_secret: null,
			},
		});
		return { ok: true };
	}),

	updateNotificationTime: orgStaffProcedure
		.input(
			z.object({
				notification_time: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.nullable(),
			})
		)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			await writeClient.organization.update({
				where: { id: orgStaff!.organization_id },
				data: { notification_time: input.notification_time },
			});
			return { ok: true };
		}),
});
