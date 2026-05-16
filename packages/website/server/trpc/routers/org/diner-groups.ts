import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { orgStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import { getOrgPermissionFilter } from "../../utils/permissions";

const groupSelect = {
	id: true,
	organization_id: true,
	name_uk: true,
	name_en: true,
	created_at: true,
	Members: {
		select: {
			id: true,
			diner_id: true,
			Diner: {
				select: { id: true, first_name: true, last_name: true, phone: true },
			},
		},
	},
} as const;

export default router({
	list: orgStaffProcedure.query(async ({ ctx: { orgStaff } }) => {
		return await readClient.dinerGroup.findMany({
			where: getOrgPermissionFilter(orgStaff!.organization_id),
			select: groupSelect,
			orderBy: { name_uk: "asc" },
		});
	}),

	create: orgStaffProcedure
		.input(
			z.object({
				name_uk: z.string().min(1).max(100),
				name_en: z.string().min(1).max(100),
			})
		)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			return await writeClient.dinerGroup.create({
				data: { ...input, organization_id: orgStaff!.organization_id },
				select: groupSelect,
			});
		}),

	update: orgStaffProcedure
		.input(
			z.object({
				id: idSchema,
				name_uk: z.string().min(1).max(100).optional(),
				name_en: z.string().min(1).max(100).optional(),
			})
		)
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const group = await readClient.dinerGroup.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!group)
				throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
			return await writeClient.dinerGroup.update({
				where: { id: input.id },
				data: { name_uk: input.name_uk, name_en: input.name_en },
				select: groupSelect,
			});
		}),

	delete: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const group = await readClient.dinerGroup.findFirst({
				where: {
					id: input.id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!group)
				throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
			await writeClient.dinerGroup.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addMember: orgStaffProcedure
		.input(z.object({ group_id: idSchema, diner_id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const group = await readClient.dinerGroup.findFirst({
				where: {
					id: input.group_id,
					...getOrgPermissionFilter(orgStaff!.organization_id),
				},
				select: { id: true },
			});
			if (!group)
				throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
			return await writeClient.dinerGroupMember.create({
				data: { group_id: input.group_id, diner_id: input.diner_id },
				select: {
					id: true,
					diner_id: true,
					Diner: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
						},
					},
				},
			});
		}),

	removeMember: orgStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { orgStaff } }) => {
			const member = await readClient.dinerGroupMember.findFirst({
				where: {
					id: input.id,
					Group: { ...getOrgPermissionFilter(orgStaff!.organization_id) },
				},
				select: { id: true },
			});
			if (!member)
				throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
			await writeClient.dinerGroupMember.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
