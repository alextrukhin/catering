import { readClient, writeClient } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { catererStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import { getCatererPermissionFilter } from "../../utils/permissions";

const inviteCodeSelect = {
	id: true,
	caterer_id: true,
	code: true,
	valid_from: true,
	valid_to: true,
	created_at: true,
	Contracts: { select: { id: true } },
} as const;

const CODE_CHARS = "ABCDEFGHJKMNPQRTVWXY3456789";
function generateCode(): string {
	let result = "";
	for (let i = 0; i < 10; i++) {
		result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
	}
	return result;
}

const createSchema = z.object({
	valid_from: z.coerce.date(),
	valid_to: z.coerce.date().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({ id: idSchema });

const paginationSchema = z.object({
	skip: z.number().int().nonnegative().optional(),
	take: z.number().int().positive().optional(),
});

export default router({
	list: catererStaffProcedure
		.input(paginationSchema.optional())
		.query(async ({ input, ctx: { catererStaff } }) => {
			return await readClient.orgInviteCode.findMany({
				where: getCatererPermissionFilter(catererStaff!.caterer_id),
				select: inviteCodeSelect,
				orderBy: { created_at: "desc" },
				skip: input?.skip,
				take: input?.take,
			});
		}),

	create: catererStaffProcedure
		.input(createSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			// retry on the rare collision
			for (let attempt = 0; attempt < 5; attempt++) {
				try {
					return await writeClient.orgInviteCode.create({
						data: {
							caterer_id: catererStaff!.caterer_id,
							code: generateCode(),
							valid_from: input.valid_from,
							valid_to: input.valid_to,
						},
						select: inviteCodeSelect,
					});
				} catch (e: any) {
					if (e?.code === "P2002" && attempt < 4) continue;
					throw e;
				}
			}
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Could not generate unique code",
			});
		}),

	update: catererStaffProcedure
		.input(updateSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const code = await readClient.orgInviteCode.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!code) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invite code not found",
				});
			}
			const { id, ...data } = input;
			return await writeClient.orgInviteCode.update({
				where: { id },
				data,
				select: inviteCodeSelect,
			});
		}),

	delete: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const code = await readClient.orgInviteCode.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!code) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invite code not found",
				});
			}
			await writeClient.orgInviteCode.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
