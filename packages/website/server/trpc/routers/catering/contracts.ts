import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { catererStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import { getCatererPermissionFilter } from "../../utils/permissions";

const contractSelect = {
	id: true,
	caterer_id: true,
	organization_id: true,
	invite_code_id: true,
	valid_from: true,
	valid_to: true,
	created_at: true,
	updated_at: true,
	Organization: { select: { id: true, name_uk: true, name_en: true } },
	InviteCode: { select: { id: true, valid_from: true, valid_to: true } },
} as const;

const contractCreateSchema = z.object({
	organization_id: idSchema,
	valid_from: z.coerce.date(),
	valid_to: z.coerce.date().optional(),
	invite_code_id: idSchema.optional(),
});

const contractUpdateSchema = contractCreateSchema
	.omit({ organization_id: true })
	.partial()
	.extend({
		id: idSchema,
		valid_to: z.coerce.date().optional().nullable(),
		invite_code_id: idSchema.optional().nullable(),
	});

const paginationSchema = z.object({
	skip: z.number().int().nonnegative().optional(),
	take: z.number().int().positive().optional(),
});

export default router({
	list: catererStaffProcedure
		.input(paginationSchema.optional())
		.query(async ({ input, ctx: { catererStaff } }) => {
			return await readClient.catererClientContract.findMany({
				where: getCatererPermissionFilter(catererStaff!.caterer_id),
				select: contractSelect,
				orderBy: { created_at: "desc" },
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: catererStaffProcedure
		.input(contractCreateSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const org = await readClient.organization.findUnique({
				where: { id: input.organization_id },
				select: { id: true },
			});
			if (!org)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organization not found",
				});

			if (input.invite_code_id) {
				const code = await readClient.orgInviteCode.findUnique({
					where: { id: input.invite_code_id },
					select: { id: true, caterer_id: true },
				});
				if (!code || code.caterer_id !== catererStaff!.caterer_id) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid invite code",
					});
				}
			}

			return await writeClient.catererClientContract.create({
				data: {
					caterer_id: catererStaff!.caterer_id,
					organization_id: input.organization_id,
					valid_from: input.valid_from,
					valid_to: input.valid_to,
					invite_code_id: input.invite_code_id,
				},
				select: contractSelect,
			});
		}),

	update: catererStaffProcedure
		.input(contractUpdateSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const contract = await readClient.catererClientContract.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true, organization_id: true },
			});
			if (!contract) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Contract not found",
				});
			}
			if (input.invite_code_id !== undefined && input.invite_code_id !== null) {
				const code = await readClient.orgInviteCode.findUnique({
					where: { id: input.invite_code_id },
					select: { caterer_id: true },
				});
				if (!code || code.caterer_id !== catererStaff!.caterer_id) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid invite code",
					});
				}
			}
			const { id, ...data } = input;
			return await writeClient.catererClientContract.update({
				where: { id },
				data,
				select: contractSelect,
			});
		}),

	delete: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const contract = await readClient.catererClientContract.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
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
