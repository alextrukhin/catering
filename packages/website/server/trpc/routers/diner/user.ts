import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { withOptionalDinerProcedure, dinerProcedure, router } from "../../trpc";
import { authCookieNames, issueSessionCookies } from "~~/server/utils/auth";
import jsonwebtoken from "jsonwebtoken";
import { phoneSchema } from "~~/shared/types/auth";
import { z } from "zod";
import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import {
	validateTelegramInitData,
	getTelegramUserId,
} from "~~/server/utils/telegram";

const dinerSelect = {
	id: true,
	phone: true,
	first_name: true,
	middle_name: true,
	last_name: true,
} as const;

const RP_ID = process.env.RP_ID ?? "localhost";
const RP_NAME = process.env.RP_NAME ?? "Catering App";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";

const userRouter = router({
	requestOtp: withOptionalDinerProcedure
		.input(phoneSchema)
		.mutation(async ({ input }) => {
			const diner = await readClient.diner.findUnique({
				where: { phone: input.phone },
				select: { id: true },
			});
			if (!diner) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No account found with this phone number",
				});
			}

			await writeClient.otpChallenge.deleteMany({
				where: { entity: "diner", phone: input.phone },
			});

			const code = String(Math.floor(100000 + Math.random() * 900000));
			const challenge = await writeClient.otpChallenge.create({
				data: {
					entity: "diner",
					phone: input.phone,
					code,
					expires_at: new Date(Date.now() + 5 * 60 * 1000),
				},
			});

			console.log(`[OTP] Diner ${input.phone}: ${code}`);
			return { challenge_id: challenge.id };
		}),

	verifyOtp: withOptionalDinerProcedure
		.input(z.object({ challenge_id: z.number(), code: z.string().length(6) }))
		.mutation(async ({ input, ctx: { event } }) => {
			const challenge = await readClient.otpChallenge.findUnique({
				where: { id: input.challenge_id },
			});

			if (
				!challenge ||
				challenge.entity !== "diner" ||
				challenge.used ||
				new Date() > challenge.expires_at ||
				challenge.code !== input.code
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Invalid or expired code",
				});
			}

			await writeClient.otpChallenge.update({
				where: { id: input.challenge_id },
				data: { used: true },
			});

			const diner = await readClient.diner.findUniqueOrThrow({
				where: { phone: challenge.phone },
				select: { ...dinerSelect, Passkeys: { select: { id: true }, take: 1 } },
			});

			const session = await writeClient.session.create({
				data: {
					entity: "diner",
					entity_id: diner.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(event, session.id, 30, authCookieNames.diner);

			const { Passkeys, ...dinerData } = diner;
			return { diner: dinerData, hasPasskey: Passkeys.length > 0 };
		}),

	startPasskeyAuth: withOptionalDinerProcedure.mutation(async () => {
		const options = await generateAuthenticationOptions({
			rpID: RP_ID,
			userVerification: "preferred",
		});
		const passkeyChallenge = await writeClient.passkeyChallenge.create({
			data: {
				entity: "diner",
				challenge: options.challenge,
				expires_at: new Date(Date.now() + 60_000),
			},
		});
		return { options, challenge_id: passkeyChallenge.id };
	}),

	verifyPasskeyAuth: withOptionalDinerProcedure
		.input(z.object({ challenge_id: z.number(), response: z.unknown() }))
		.mutation(async ({ input, ctx: { event } }) => {
			const passkeyChallenge = await readClient.passkeyChallenge.findUnique({
				where: { id: input.challenge_id },
			});

			if (
				!passkeyChallenge ||
				passkeyChallenge.entity !== "diner" ||
				new Date() > passkeyChallenge.expires_at
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Challenge expired",
				});
			}
			await writeClient.passkeyChallenge.delete({
				where: { id: input.challenge_id },
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = input.response as any;
			const passkey = await readClient.dinerPasskey.findUnique({
				where: { credential_id: response.id },
				include: { Diner: { select: dinerSelect } },
			});
			if (!passkey) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Passkey not recognized",
				});
			}

			const verification = await verifyAuthenticationResponse({
				response,
				expectedChallenge: passkeyChallenge.challenge,
				expectedOrigin: ORIGIN,
				expectedRPID: RP_ID,
				credential: {
					id: passkey.credential_id,
					publicKey: isoBase64URL.toBuffer(passkey.public_key),
					counter: passkey.counter,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					transports: passkey.transports as any,
				},
			});

			if (!verification.verified) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Passkey verification failed",
				});
			}

			await writeClient.dinerPasskey.update({
				where: { id: passkey.id },
				data: { counter: verification.authenticationInfo.newCounter },
			});

			const session = await writeClient.session.create({
				data: {
					entity: "diner",
					entity_id: passkey.diner_id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(event, session.id, 30, authCookieNames.diner);

			return { diner: passkey.Diner };
		}),

	startPasskeyRegistration: dinerProcedure.mutation(
		async ({ ctx: { diner } }) => {
			const options = await generateRegistrationOptions({
				rpName: RP_NAME,
				rpID: RP_ID,
				userName: diner!.phone ?? String(diner!.id),
				userDisplayName: `${diner!.first_name} ${diner!.last_name}`,
				userID: new TextEncoder().encode(String(diner!.id)),
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			});
			const passkeyChallenge = await writeClient.passkeyChallenge.create({
				data: {
					entity: "diner",
					challenge: options.challenge,
					expires_at: new Date(Date.now() + 60_000),
				},
			});
			return { options, challenge_id: passkeyChallenge.id };
		}
	),

	verifyPasskeyRegistration: dinerProcedure
		.input(
			z.object({
				challenge_id: z.number(),
				name: z.string(),
				response: z.unknown(),
			})
		)
		.mutation(async ({ input, ctx: { diner } }) => {
			const passkeyChallenge = await readClient.passkeyChallenge.findUnique({
				where: { id: input.challenge_id },
			});

			if (
				!passkeyChallenge ||
				passkeyChallenge.entity !== "diner" ||
				new Date() > passkeyChallenge.expires_at
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Challenge expired",
				});
			}
			await writeClient.passkeyChallenge.delete({
				where: { id: input.challenge_id },
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = input.response as any;
			const verification = await verifyRegistrationResponse({
				response,
				expectedChallenge: passkeyChallenge.challenge,
				expectedOrigin: ORIGIN,
				expectedRPID: RP_ID,
			});

			if (!verification.verified || !verification.registrationInfo) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Passkey registration failed",
				});
			}

			const { credential } = verification.registrationInfo;
			await writeClient.dinerPasskey.create({
				data: {
					diner_id: diner!.id,
					credential_id: credential.id,
					public_key: isoBase64URL.fromBuffer(credential.publicKey),
					passkey_user_id: String(diner!.id),
					counter: credential.counter,
					backed_up: verification.registrationInfo.credentialBackedUp,
					name: input.name,
					transports: (response.response?.transports ?? []) as string[],
				},
			});

			return { registered: true };
		}),

	logout: withOptionalDinerProcedure.mutation(async ({ ctx: { event } }) => {
		const token = getCookie(event, authCookieNames.diner.token);
		if (token) {
			try {
				const { session_id } = jsonwebtoken.verify(
					token,
					process.env.JWT_SECRET!
				) as { session_id: number };
				await writeClient.session.update({
					where: { id: session_id },
					data: { ended_at: new Date() },
				});
			} catch {}
		}
		deleteCookie(event, authCookieNames.diner.token);
		deleteCookie(event, authCookieNames.diner.authenticated);
	}),

	me: withOptionalDinerProcedure.query(({ ctx: { diner } }) => diner ?? null),

	listSessions: dinerProcedure.query(async ({ ctx: { diner } }) => {
		return await readClient.session.findMany({
			where: { entity: "diner", entity_id: diner!.id, ended_at: null },
			orderBy: { started_at: "desc" },
			select: { id: true, ip: true, device: true, started_at: true },
		});
	}),

	deleteSession: dinerProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx: { diner } }) => {
			const session = await readClient.session.findFirst({
				where: { id: input.id, entity: "diner", entity_id: diner!.id },
			});
			if (!session)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			await writeClient.session.update({
				where: { id: input.id },
				data: { ended_at: new Date() },
			});
			return { ok: true };
		}),

	listPasskeys: dinerProcedure.query(async ({ ctx: { diner } }) => {
		return await readClient.dinerPasskey.findMany({
			where: { diner_id: diner!.id },
			select: { id: true, name: true, created_at: true },
			orderBy: { created_at: "desc" },
		});
	}),

	deletePasskey: dinerProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx: { diner } }) => {
			const pk = await readClient.dinerPasskey.findFirst({
				where: { id: input.id, diner_id: diner!.id },
			});
			if (!pk)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Passkey not found",
				});
			await writeClient.dinerPasskey.delete({ where: { id: input.id } });
			return { ok: true };
		}),

	/** Link Telegram account when already authenticated (called from TG mini app). */
	linkTelegram: dinerProcedure
		.input(z.object({ init_data_raw: z.string() }))
		.mutation(async ({ input, ctx: { diner } }) => {
			const org = await readClient.organization.findFirst({
				where: { id: diner!.organization_id },
				select: { bot_token: true },
			});
			if (!org?.bot_token)
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "No Telegram bot configured for this school",
				});
			const params = validateTelegramInitData(
				input.init_data_raw,
				org.bot_token
			);
			if (!params)
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Invalid Telegram data",
				});
			const tgId = getTelegramUserId(params);
			if (!tgId) throw new TRPCError({ code: "BAD_REQUEST" });
			await writeClient.diner.update({
				where: { id: diner!.id },
				data: { telegram_id: tgId },
			});
			return { ok: true };
		}),

	unlinkTelegram: dinerProcedure.mutation(async ({ ctx: { diner } }) => {
		await writeClient.diner.update({
			where: { id: diner!.id },
			data: { telegram_id: null },
		});
		return { ok: true };
	}),

	/** Auto-login via Telegram initData (not yet authenticated). */
	loginWithTelegram: withOptionalDinerProcedure
		.input(z.object({ init_data_raw: z.string(), organization_id: z.number() }))
		.mutation(async ({ input, ctx: { event } }) => {
			const org = await readClient.organization.findFirst({
				where: { id: input.organization_id },
				select: { bot_token: true },
			});
			if (!org?.bot_token)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Bot not configured",
				});
			const params = validateTelegramInitData(
				input.init_data_raw,
				org.bot_token
			);
			if (!params)
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Invalid Telegram data",
				});
			const tgId = getTelegramUserId(params);
			if (!tgId) throw new TRPCError({ code: "BAD_REQUEST" });
			const diner = await readClient.diner.findFirst({
				where: { telegram_id: tgId, organization_id: input.organization_id },
				select: dinerSelect,
			});
			if (!diner)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No diner linked to this Telegram account",
				});
			const session = await writeClient.session.create({
				data: {
					entity: "diner",
					entity_id: diner.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: "Telegram",
				},
			});
			issueSessionCookies(event, session.id, 30, authCookieNames.diner);
			return { diner };
		}),

	/** Returns telegram_id status (linked / not linked) for current user. */
	telegramStatus: dinerProcedure.query(async ({ ctx: { diner } }) => {
		const d = await readClient.diner.findUniqueOrThrow({
			where: { id: diner!.id },
			select: { telegram_id: true },
		});
		return { linked: d.telegram_id !== null };
	}),
});

export default userRouter;
