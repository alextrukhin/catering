import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import {
	withOptionalGuardianProcedure,
	guardianProcedure,
	router,
} from "../../trpc";
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

const guardianSelect = {
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
	requestOtp: withOptionalGuardianProcedure
		.input(phoneSchema)
		.mutation(async ({ input }) => {
			const guardian = await readClient.guardian.findUnique({
				where: { phone: input.phone },
				select: { id: true },
			});
			if (!guardian) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No account found with this phone number",
				});
			}

			await writeClient.otpChallenge.deleteMany({
				where: { entity: "guardian", phone: input.phone },
			});
			const code = String(Math.floor(100000 + Math.random() * 900000));
			const challenge = await writeClient.otpChallenge.create({
				data: {
					entity: "guardian",
					phone: input.phone,
					code,
					expires_at: new Date(Date.now() + 5 * 60 * 1000),
				},
			});
			console.log(`[OTP] Guardian ${input.phone}: ${code}`);
			return { challenge_id: challenge.id };
		}),

	verifyOtp: withOptionalGuardianProcedure
		.input(z.object({ challenge_id: z.number(), code: z.string().length(6) }))
		.mutation(async ({ input, ctx: { event } }) => {
			const challenge = await readClient.otpChallenge.findUnique({
				where: { id: input.challenge_id },
			});
			if (
				!challenge ||
				challenge.entity !== "guardian" ||
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
			const guardian = await readClient.guardian.findUniqueOrThrow({
				where: { phone: challenge.phone },
				select: {
					...guardianSelect,
					Passkeys: { select: { id: true }, take: 1 },
				},
			});
			const session = await writeClient.session.create({
				data: {
					entity: "guardian",
					entity_id: guardian.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(event, session.id, 30, authCookieNames.guardian);
			const { Passkeys, ...guardianData } = guardian;
			return { guardian: guardianData, hasPasskey: Passkeys.length > 0 };
		}),

	startPasskeyAuth: withOptionalGuardianProcedure.mutation(async () => {
		const options = await generateAuthenticationOptions({
			rpID: RP_ID,
			userVerification: "preferred",
		});
		const passkeyChallenge = await writeClient.passkeyChallenge.create({
			data: {
				entity: "guardian",
				challenge: options.challenge,
				expires_at: new Date(Date.now() + 60_000),
			},
		});
		return { options, challenge_id: passkeyChallenge.id };
	}),

	verifyPasskeyAuth: withOptionalGuardianProcedure
		.input(z.object({ challenge_id: z.number(), response: z.unknown() }))
		.mutation(async ({ input, ctx: { event } }) => {
			const passkeyChallenge = await readClient.passkeyChallenge.findUnique({
				where: { id: input.challenge_id },
			});
			if (
				!passkeyChallenge ||
				passkeyChallenge.entity !== "guardian" ||
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
			const passkey = await readClient.guardianPasskey.findUnique({
				where: { credential_id: response.id },
				include: { Guardian: { select: guardianSelect } },
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
			await writeClient.guardianPasskey.update({
				where: { id: passkey.id },
				data: { counter: verification.authenticationInfo.newCounter },
			});
			const session = await writeClient.session.create({
				data: {
					entity: "guardian",
					entity_id: passkey.guardian_id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(event, session.id, 30, authCookieNames.guardian);
			return { guardian: passkey.Guardian };
		}),

	startPasskeyRegistration: guardianProcedure.mutation(
		async ({ ctx: { guardian } }) => {
			const options = await generateRegistrationOptions({
				rpName: RP_NAME,
				rpID: RP_ID,
				userName: guardian!.phone ?? String(guardian!.id),
				userDisplayName: `${guardian!.first_name} ${guardian!.last_name}`,
				userID: new TextEncoder().encode(String(guardian!.id)),
				authenticatorSelection: {
					residentKey: "preferred",
					userVerification: "preferred",
				},
			});
			const passkeyChallenge = await writeClient.passkeyChallenge.create({
				data: {
					entity: "guardian",
					challenge: options.challenge,
					expires_at: new Date(Date.now() + 60_000),
				},
			});
			return { options, challenge_id: passkeyChallenge.id };
		}
	),

	verifyPasskeyRegistration: guardianProcedure
		.input(
			z.object({
				challenge_id: z.number(),
				name: z.string(),
				response: z.unknown(),
			})
		)
		.mutation(async ({ input, ctx: { guardian } }) => {
			const passkeyChallenge = await readClient.passkeyChallenge.findUnique({
				where: { id: input.challenge_id },
			});
			if (
				!passkeyChallenge ||
				passkeyChallenge.entity !== "guardian" ||
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
			await writeClient.guardianPasskey.create({
				data: {
					guardian_id: guardian!.id,
					credential_id: credential.id,
					public_key: isoBase64URL.fromBuffer(credential.publicKey),
					passkey_user_id: String(guardian!.id),
					counter: credential.counter,
					backed_up: verification.registrationInfo.credentialBackedUp,
					name: input.name,
					transports: (response.response?.transports ?? []) as string[],
				},
			});
			return { registered: true };
		}),

	logout: withOptionalGuardianProcedure.mutation(async ({ ctx: { event } }) => {
		const token = getCookie(event, authCookieNames.guardian.token);
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
		deleteCookie(event, authCookieNames.guardian.token);
		deleteCookie(event, authCookieNames.guardian.authenticated);
	}),

	me: withOptionalGuardianProcedure.query(
		({ ctx: { guardian } }) => guardian ?? null
	),

	listSessions: guardianProcedure.query(async ({ ctx: { guardian } }) => {
		return await readClient.session.findMany({
			where: { entity: "guardian", entity_id: guardian!.id, ended_at: null },
			orderBy: { started_at: "desc" },
			select: { id: true, ip: true, device: true, started_at: true },
		});
	}),

	deleteSession: guardianProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx: { guardian } }) => {
			const session = await readClient.session.findFirst({
				where: { id: input.id, entity: "guardian", entity_id: guardian!.id },
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

	listPasskeys: guardianProcedure.query(async ({ ctx: { guardian } }) => {
		return await readClient.guardianPasskey.findMany({
			where: { guardian_id: guardian!.id },
			select: { id: true, name: true, created_at: true },
			orderBy: { created_at: "desc" },
		});
	}),

	deletePasskey: guardianProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx: { guardian } }) => {
			const pk = await readClient.guardianPasskey.findFirst({
				where: { id: input.id, guardian_id: guardian!.id },
			});
			if (!pk)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Passkey not found",
				});
			await writeClient.guardianPasskey.delete({ where: { id: input.id } });
			return { ok: true };
		}),

	linkTelegram: guardianProcedure
		.input(z.object({ init_data_raw: z.string() }))
		.mutation(async ({ input, ctx: { guardian } }) => {
			const org = await readClient.organization.findFirst({
				where: { id: guardian!.organization_id },
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
			await writeClient.guardian.update({
				where: { id: guardian!.id },
				data: { telegram_id: tgId },
			});
			return { ok: true };
		}),

	unlinkTelegram: guardianProcedure.mutation(async ({ ctx: { guardian } }) => {
		await writeClient.guardian.update({
			where: { id: guardian!.id },
			data: { telegram_id: null },
		});
		return { ok: true };
	}),

	loginWithTelegram: withOptionalGuardianProcedure
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
			const guardian = await readClient.guardian.findFirst({
				where: {
					telegram_id: tgId,
					organization_id: input.organization_id,
				},
				select: guardianSelect,
			});
			if (!guardian)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No guardian linked to this Telegram account",
				});
			const session = await writeClient.session.create({
				data: {
					entity: "guardian",
					entity_id: guardian.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: "Telegram",
				},
			});
			issueSessionCookies(event, session.id, 30, authCookieNames.guardian);
			return { guardian };
		}),

	telegramStatus: guardianProcedure.query(async ({ ctx: { guardian } }) => {
		const g = await readClient.guardian.findUniqueOrThrow({
			where: { id: guardian!.id },
			select: { telegram_id: true },
		});
		return { linked: g.telegram_id !== null };
	}),
});

export default userRouter;
