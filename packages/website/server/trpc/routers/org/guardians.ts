import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { orgStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import { getOrgPermissionFilter } from "../../utils/permissions";

const guardianSelect = {
	id: true,
	first_name: true,
	last_name: true,
	middle_name: true,
	phone: true,
	created_at: true,
	Diners: {
		select: {
			Diner: { select: { id: true, first_name: true, last_name: true } },
		},
	},
} as const;

const guardianCreateSchema = z.object({
	first_name: z.string().min(1).max(100),
	last_name: z.string().min(1).max(100),
	middle_name: z.string().max(100).optional(),
	phone: z.string().max(20).optional(),
	diner_ids: z.array(idSchema).optional(),
});

const guardianUpdateSchema = guardianCreateSchema.partial().extend({
	id: idSchema,
	middle_name: z.string().max(100).optional().nullable(),
	phone: z.string().max(20).optional().nullable(),
});

const paginationSchema = z.object({
	skip: z.number().int().nonnegative().optional(),
	take: z.number().int().positive().optional(),
});

export default router({
	list: orgStaffProcedure
		.input(paginationSchema.optional())
		.query(async ({ input, ctx: { orgStaff } }) => {
			return await readClient.guardian.findMany({
				where: getOrgPermissionFilter(orgStaff!.organization_id),
				select: guardianSelect,
				orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: orgStaffProcedure
		.input(guardianCreateSchema)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const existing = await readClient.guardian.findFirst({
				where: { phone: input.phone },
				select: { id: true },
			});
			if (existing)
				throw new TRPCError({
					code: "CONFLICT",
					message: "Phone already in use",
				});

			const { diner_ids, ...rest } = input;
			return await writeClient.guardian.create({
				data: {
					...rest,
					organization_id: orgStaff!.organization_id,
					Diners: diner_ids?.length
						? { create: diner_ids.map((diner_id) => ({ diner_id })) }
						: undefined,
				},
				select: guardianSelect,
			});
		}),

	update: orgStaffProcedure
		.input(guardianUpdateSchema)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const guardian = await readClient.guardian.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!guardian) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Guardian not found",
				});
			}
			const { id, diner_ids, ...data } = input;
			return await writeClient.guardian.update({
				where: { id },
				data: {
					...data,
					...(diner_ids !== undefined && {
						Diners: {
							deleteMany: {},
							create: diner_ids.map((diner_id) => ({ diner_id })),
						},
					}),
				},
				select: guardianSelect,
			});
		}),

	delete: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const guardian = await readClient.guardian.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!guardian) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Guardian not found",
				});
			}
			await writeClient.guardian.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
