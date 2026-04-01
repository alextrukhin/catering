import { Prisma, readClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import {
	withOptionalOrgStaffProcedure,
	orgStaffProcedure,
	router,
} from "../trpc";
import { hashPassword, verifyPassword } from "~~/server/utils/auth";
import jsonwebtoken from "jsonwebtoken";
import { signInSchema } from "~~/shared/types/auth";

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
