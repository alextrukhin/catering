import { Prisma, readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import {
	publicWithOptionalCatererStaffProcedure,
	catererStaffProcedure,
	router,
} from "../../trpc";
import {
	authCookieNames,
	hashPassword,
	verifyPassword,
	issueSessionCookies,
} from "~~/server/utils/auth";
import jsonwebtoken from "jsonwebtoken";
import { signInSchema, catererSignUpSchema } from "~~/shared/types/auth";

const catererStaffSelect = {
	id: true,
	email: true,
	first_name: true,
	middle_name: true,
	last_name: true,
	type: true,
	caterer_id: true,
	Caterer: { select: { id: true, name_uk: true, name_en: true } },
} as const;

const userRouter = router({
	login: publicWithOptionalCatererStaffProcedure
		.input(signInSchema)
		.mutation(async ({ input, ctx: { event } }) => {
			const catererStaff = await readClient.catererStaff.findFirst({
				where: {
					email: {
						equals: input.email,
						mode: Prisma.QueryMode.insensitive,
					},
				},
				select: { ...catererStaffSelect, password: true },
			});

			if (
				!catererStaff ||
				!verifyPassword(input.password, catererStaff.password)
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Invalid email or password",
				});
			}

			const ageDays = input.remember_me ? 30 : 7;
			const session = await writeClient.session.create({
				data: {
					entity: "caterer_staff",
					entity_id: catererStaff.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(
				event,
				session.id,
				ageDays,
				authCookieNames.catererStaff
			);

			const { password: _, ...safeCatererStaff } = catererStaff;
			return { staff: safeCatererStaff };
		}),

	register: publicWithOptionalCatererStaffProcedure
		.input(catererSignUpSchema)
		.mutation(async ({ input, ctx: { event } }) => {
			const existing = await readClient.catererStaff.findFirst({
				where: {
					email: {
						equals: input.email,
						mode: Prisma.QueryMode.insensitive,
					},
				},
				select: { id: true },
			});

			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "An account with this email already exists",
				});
			}

			const catererStaff = await writeClient.$transaction(async (tx) => {
				const caterer = await tx.caterer.create({
					data: { name_uk: input.caterer_name, name_en: input.caterer_name },
				});
				return tx.catererStaff.create({
					data: {
						email: input.email.toLowerCase(),
						password: hashPassword(input.password),
						first_name: input.first_name,
						last_name: input.last_name,
						type: "ADMIN",
						caterer_id: caterer.id,
					},
					select: catererStaffSelect,
				});
			});

			const ageDays = input.remember_me ? 30 : 7;
			const session = await writeClient.session.create({
				data: {
					entity: "caterer_staff",
					entity_id: catererStaff.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(
				event,
				session.id,
				ageDays,
				authCookieNames.catererStaff
			);

			return { staff: catererStaff };
		}),

	logout: publicWithOptionalCatererStaffProcedure.mutation(
		async ({ ctx: { event } }) => {
			const token = getCookie(event, authCookieNames.catererStaff.token);
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
			deleteCookie(event, authCookieNames.catererStaff.token);
			deleteCookie(event, authCookieNames.catererStaff.authenticated);
		}
	),

	me: publicWithOptionalCatererStaffProcedure.query(
		async ({ ctx: { catererStaff } }) => {
			if (!catererStaff) return null;
			return await readClient.catererStaff.findUnique({
				where: { id: catererStaff.id },
				select: catererStaffSelect,
			});
		}
	),

	meExtended: catererStaffProcedure.query(async ({ ctx: { catererStaff } }) => {
		return await readClient.catererStaff.findUniqueOrThrow({
			where: { id: catererStaff!.id },
			select: catererStaffSelect,
		});
	}),
});

export default userRouter;
