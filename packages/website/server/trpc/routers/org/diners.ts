import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { orgStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import { getOrgPermissionFilter } from "../../utils/permissions";

const dinerSelect = {
	id: true,
	first_name: true,
	last_name: true,
	middle_name: true,
	phone: true,
	created_at: true,
	Guardians: {
		select: {
			Guardian: { select: { id: true, first_name: true, last_name: true } },
		},
	},
} as const;

const dinerCreateSchema = z.object({
	first_name: z.string().min(1).max(100),
	last_name: z.string().min(1).max(100),
	middle_name: z.string().max(100).optional(),
	phone: z.string().max(20).optional(),
});

const dinerUpdateSchema = dinerCreateSchema.partial().extend({
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
			return await readClient.diner.findMany({
				where: getOrgPermissionFilter(orgStaff!.organization_id),
				select: dinerSelect,
				orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: orgStaffProcedure
		.input(dinerCreateSchema)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const existing = await readClient.diner.findFirst({
				where: { phone: input.phone },
				select: { id: true },
			});
			if (existing)
				throw new TRPCError({
					code: "CONFLICT",
					message: "Phone already in use",
				});

			return await writeClient.diner.create({
				data: { ...input, organization_id: orgStaff!.organization_id },
				select: dinerSelect,
			});
		}),

	update: orgStaffProcedure
		.input(dinerUpdateSchema)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const diner = await readClient.diner.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!diner) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Diner not found" });
			}
			const { id, ...data } = input;
			return await writeClient.diner.update({
				where: { id },
				data,
				select: dinerSelect,
			});
		}),

	delete: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const diner = await readClient.diner.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!diner) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Diner not found" });
			}
			await writeClient.diner.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
