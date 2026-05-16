import { Prisma, readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import {
	withOptionalOrgStaffProcedure,
	orgStaffProcedure,
	router,
} from "../../trpc";
import {
	authCookieNames,
	hashPassword,
	verifyPassword,
	issueSessionCookies,
} from "~~/server/utils/auth";
import jsonwebtoken from "jsonwebtoken";
import { signInSchema, signUpSchema } from "~~/shared/types/auth";

const orgStaffSelect = {
	id: true,
	email: true,
	first_name: true,
	middle_name: true,
	last_name: true,
	type: true,
	organization_id: true,
	Organization: { select: { id: true, name_uk: true, name_en: true } },
} as const;

const userRouter = router({
	login: withOptionalOrgStaffProcedure
		.input(signInSchema)
		.mutation(async ({ input, ctx: { event } }) => {
			const staff = await readClient.orgStaff.findFirst({
				where: {
					email: {
						equals: input.email,
						mode: Prisma.QueryMode.insensitive,
					},
				},
				select: { ...orgStaffSelect, password: true },
			});

			if (!staff || !verifyPassword(input.password, staff.password)) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Invalid email or password",
				});
			}

			const ageDays = input.remember_me ? 30 : 7;
			const session = await writeClient.session.create({
				data: {
					entity: "org_staff",
					entity_id: staff.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(event, session.id, ageDays, authCookieNames.orgStaff);

			const { password: _, ...safeStaff } = staff;
			return { staff: safeStaff };
		}),

	register: withOptionalOrgStaffProcedure
		.input(signUpSchema)
		.mutation(async ({ input, ctx: { event } }) => {
			const existing = await readClient.orgStaff.findFirst({
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

			const staff = await writeClient.$transaction(async (tx) => {
				const org = await tx.organization.create({
					data: { name_uk: input.org_name, name_en: input.org_name },
				});
				return tx.orgStaff.create({
					data: {
						email: input.email.toLowerCase(),
						password: hashPassword(input.password),
						first_name: input.first_name,
						last_name: input.last_name,
						type: "ADMIN",
						organization_id: org.id,
					},
					select: orgStaffSelect,
				});
			});

			const ageDays = input.remember_me ? 30 : 7;
			const session = await writeClient.session.create({
				data: {
					entity: "org_staff",
					entity_id: staff.id,
					ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
					device: getHeader(event, "user-agent") ?? undefined,
				},
			});
			issueSessionCookies(event, session.id, ageDays, authCookieNames.orgStaff);

			return { staff };
		}),

	logout: withOptionalOrgStaffProcedure.mutation(async ({ ctx: { event } }) => {
		const token = getCookie(event, authCookieNames.orgStaff.token);
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
		deleteCookie(event, authCookieNames.orgStaff.token);
		deleteCookie(event, authCookieNames.orgStaff.authenticated);
	}),

	me: withOptionalOrgStaffProcedure.query(async ({ ctx: { orgStaff } }) => {
		if (!orgStaff) return null;
		return await readClient.orgStaff.findUnique({
			where: { id: orgStaff.id },
			select: orgStaffSelect,
		});
	}),

	meExtended: orgStaffProcedure.query(async ({ ctx: { orgStaff: staff } }) => {
		return await readClient.orgStaff.findUniqueOrThrow({
			where: { id: staff!.id },
			select: orgStaffSelect,
		});
	}),
});

export default userRouter;
