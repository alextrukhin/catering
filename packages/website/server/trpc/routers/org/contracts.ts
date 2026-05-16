import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { orgStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import { getOrgPermissionFilter } from "../../utils/permissions";

const contractSelect = {
	id: true,
	valid_from: true,
	valid_to: true,
	invite_code_id: true,
	created_at: true,
	Caterer: { select: { id: true, name_uk: true, name_en: true } },
	InviteCode: {
		select: { id: true, code: true, valid_from: true, valid_to: true },
	},
} as const;

const paginationSchema = z.object({
	skip: z.number().int().nonnegative().optional(),
	take: z.number().int().positive().optional(),
});

export default router({
	list: orgStaffProcedure
		.input(paginationSchema.optional())
		.query(async ({ input, ctx: { orgStaff } }) => {
			return await readClient.catererClientContract.findMany({
				where: getOrgPermissionFilter(orgStaff!.organization_id),
				select: contractSelect,
				orderBy: { created_at: "desc" },
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: orgStaffProcedure
		.input(
			z.object({
				invite_code: z.string().length(10),
				valid_from: z.coerce.date(),
				valid_to: z.coerce.date().optional(),
			})
		)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const code = await readClient.orgInviteCode.findUnique({
				where: { code: input.invite_code },
				select: {
					id: true,
					caterer_id: true,
					valid_from: true,
					valid_to: true,
				},
			});
			if (!code)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invite code not found",
				});

			const now = new Date();
			if (code.valid_to && code.valid_to < now)
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invite code has expired",
				});

			return await writeClient.catererClientContract.create({
				data: {
					organization_id: orgStaff!.organization_id,
					caterer_id: code.caterer_id,
					invite_code_id: code.id,
					valid_from: input.valid_from,
					valid_to: input.valid_to,
				},
				select: contractSelect,
			});
		}),

	delete: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const contract = await readClient.catererClientContract.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!contract) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Contract not found",
				});
			}
			await writeClient.catererClientContract.delete({
				where: { id: input.id },
			});
			return { success: true };
		}),
});
