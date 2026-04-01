import { Prisma, readClient, writeClient, type UserType } from "prismaclient";
import { adminProcedure, router, userProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { orderBy } from "~~/shared/types";
import { userSchema } from "~~/shared/types/entities/User";
import { assertId, parseOrderBy } from "~~/server/utils";
import { deleteObjectFromS3, putObjectToS3 } from "~~/server/services/s3";

export const getUserPermissionsFilter = (
	user: { id: number; type: UserType },
	mode: "write" | "read" = "read"
) => {
	return user.type !== "ADMIN"
		? ({
				OR: [
					{ id: user.id },
					{
						CompanyEmployees: {
							some: {
								Company: {
									Employees: { some: { user_id: user.id } },
								},
							},
						},
					},
					{
						Farmers: {
							some: {
								CompanyFarmer: {
									some: {
										Company: { Employees: { some: { user_id: user.id } } },
									},
								},
							},
						},
					},
					{
						Farmers: { some: { Contractors: { some: { user_id: user.id } } } },
					},
					{
						Farmers: { some: { Staffs: { some: { user_id: user.id } } } },
					},
				],
		  } satisfies Prisma.UserWhereInput)
		: {};
};

export const ensureEmailIsUnique = async (email: string, user_id?: number) => {
	const userExists = await readClient.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: Prisma.QueryMode.insensitive,
			},
			id: user_id
				? {
						not: user_id,
				  }
				: undefined,
		},
	});
	if (userExists) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Email is already in use",
		});
	}
};

export const handlePhoto = async <
	T extends { id: number; photo_file_id: number | null }
>(
	user: T,
	new_photo: File | null,
	userId: number
) => {
	if (new_photo) {
		let compressed = null;
		try {
			compressed = await compressAvatar(await new_photo.arrayBuffer());
		} catch (error) {
			console.error("Could not process image", error);
			throw createError({
				statusCode: 500,
				statusMessage: "Internal Server Error",
				message: "Uploaded file is corrupted or not an image",
			});
		}
		let createdFile = null;
		try {
			createdFile = await putObjectToS3({
				body: compressed,
				folder: "avatars",
				originalName: new_photo!.name,
				name: `${user.id}.jpeg`,
				uploaderUserId: userId,
				allowOverwrite: true,
			});
		} catch (error) {
			console.error("Error saving avatar", error);
			throw createError({
				statusCode: 500,
				statusMessage: "Internal Server Error",
				message: "An error occurred while saving the file",
			});
		}

		return await writeClient.user.update({
			where: { id: user.id },
			data: { photo_file_id: createdFile.id },
			include: {
				Photo: true,
			},
		});
	} else {
		return user;
	}
};

const usersRouter = router({
	list: adminProcedure
		.input(
			z.object({
				search: z.string().nullish(),
				skip: z.number().default(0),
				take: z.number().default(100),
				orderBy: orderBy.optional(),
			})
		)
		.query(async ({ input }) => {
			const where = {
				OR: input.search
					? [
							{
								email: {
									contains: input.search,
									mode: Prisma.QueryMode.insensitive,
								},
							},
							{
								name: {
									contains: input.search,
									mode: Prisma.QueryMode.insensitive,
								},
							},
							{
								mobile_number: {
									contains: input.search,
									mode: Prisma.QueryMode.insensitive,
								},
							},
					  ]
					: undefined,
			};

			const [users, total] = await readClient.$transaction([
				readClient.user.findMany({
					where,
					include: {
						_count: {
							select: {
								Fields: true,
								Trials: true,
								Blocks: true,
								Plots: true,
								Disturbances: true,
								GuidanceLines: true,
								Farmers: true,
								Contractors: true,
							},
						},
					},
					orderBy: parseOrderBy(input.orderBy),
					skip: input.skip,
					take: input.take,
				}),
				readClient.user.count({ where }),
			]);

			return {
				users,
				total,
			};
		}),
	get: adminProcedure.input(z.number()).query(async ({ input }) => {
		assertId(input);
		const record = await readClient.user.findUnique({
			where: { id: input },
			include: {
				Photo: true,
			},
		});

		return record
			? {
					...record,
					password: "",
			  }
			: null;
	}),
	create: adminProcedure
		.input(
			zfd.formData(
				z.object({
					data: jsonFormDataField.pipe(userSchema),
					new_photo: zfd.file(z.instanceof(File).optional()),
				})
			)
		)
		.mutation(async ({ input }) => {
			const { data, new_photo } = input;

			await ensureEmailIsUnique(data.email);

			const user = await writeClient.user.create({
				data: { ...data, id: undefined, password: "" },
			});

			const updatedUserWithPhoto = await handlePhoto(
				user,
				new_photo || null,
				user.id
			);

			return { ...updatedUserWithPhoto, password: undefined };
		}),
	update: adminProcedure
		.input(
			zfd.formData(
				z.object({
					data: jsonFormDataField.pipe(
						userSchema.partial().extend({
							id: z.number(),
						})
					),
					new_photo: zfd.file(z.instanceof(File).optional()),
				})
			)
		)
		.mutation(async ({ input }) => {
			const {
				data: { id, ...data },
				new_photo,
			} = input;

			const user = await readClient.user.findUniqueOrThrow({
				where: { id },
				include: {
					Photo: true,
				},
			});

			if (data.email) {
				await ensureEmailIsUnique(data.email, id);
			}

			const record = await writeClient.user.update({
				where: { id },
				data,
			});

			if (
				user.photo_file_id !== null &&
				!new_photo &&
				data.photo_file_id === null
			) {
				await deleteObjectFromS3(`avatars/${id}.jpeg`);
			}

			const updatedUserWithPhoto = await handlePhoto(
				record,
				new_photo || null,
				user.id
			);

			return { ...updatedUserWithPhoto, password: undefined };
		}),
	delete: adminProcedure.input(z.number()).mutation(async ({ input }) => {
		const deleted = await writeClient.user.delete({
			where: { id: input },
		});
		if (deleted.photo_file_id) {
			await deleteObjectFromS3(`avatars/${deleted.id}.jpeg`);
		}
		return deleted;
	}),
	search: userProcedure
		.input(
			z.object({
				search: z.string().nullish(),
				take: z.number().optional(),
				skip: z.number().optional(),
				orderBy: orderBy.optional(),
			})
		)
		.query(async ({ input, ctx: { user } }) => {
			if (!input.search) {
				return {
					users: [],
					total: 0,
				};
			}

			const where = {
				AND: [
					{
						OR: [
							{
								email: {
									contains: input.search,
									mode: Prisma.QueryMode.insensitive,
								},
							},
							{
								first_name: {
									contains: input.search,
									mode: Prisma.QueryMode.insensitive,
								},
							},
							{
								last_name: {
									contains: input.search,
									mode: Prisma.QueryMode.insensitive,
								},
							},
						],
					},
					getUserPermissionsFilter(user),
				],
			};

			const [users, total] = await Promise.all([
				readClient.user.findMany({
					where,
					orderBy: parseOrderBy(input.orderBy),
					skip: input.skip,
					take: input.take,
					select: {
						id: true,
						first_name: true,
						last_name: true,
						email: true,
						mobile_number: true,
						preferred_messenger: true,
						Photo: {
							select: {
								id: true,
							},
						},
					},
				}),
				readClient.user.count({ where }),
			]);

			return {
				users,
				total,
			};
		}),
});

export default usersRouter;
