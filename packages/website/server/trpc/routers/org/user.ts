import { Prisma, readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import {
	withOptionalOrgStaffProcedure,
	orgStaffProcedure,
	router,
} from "../../trpc";
import { hashPassword, verifyPassword } from "~~/server/utils/auth";
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
			const token = jsonwebtoken.sign(
				{ id: staff.id, email: staff.email },
				process.env.JWT_SECRET!,
				{ expiresIn: `${ageDays}d` }
			);
			const maxAge = 60 * 60 * 24 * ageDays;
			setCookie(event, "jwt_org", token, { httpOnly: true, maxAge });
			setCookie(event, "org_authenticated", "true", {
				httpOnly: false,
				maxAge,
			});

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
				const org = await tx.organization.create({ data: {} });
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
			const token = jsonwebtoken.sign(
				{ id: staff.id, email: staff.email },
				process.env.JWT_SECRET!,
				{ expiresIn: `${ageDays}d` }
			);
			const maxAge = 60 * 60 * 24 * ageDays;
			setCookie(event, "jwt_org", token, { httpOnly: true, maxAge });
			setCookie(event, "org_authenticated", "true", {
				httpOnly: false,
				maxAge,
			});

			return { staff };
		}),

	logout: withOptionalOrgStaffProcedure.mutation(({ ctx: { event } }) => {
		deleteCookie(event, "jwt_org");
		deleteCookie(event, "org_authenticated");
	}),

	me: withOptionalOrgStaffProcedure.query(({ ctx: { orgStaff } }) => {
		return orgStaff ?? null;
	}),

	meExtended: orgStaffProcedure.query(async ({ ctx: { orgStaff: staff } }) => {
		return readClient.orgStaff.findUniqueOrThrow({
			where: { id: staff!.id },
			select: {
				...orgStaffSelect,
				Organization: { select: { id: true } },
			},
		});
	}),
});

export default userRouter;
