import { readClient, writeClient, FileProvider } from "prismaclient";
import { TRPCError } from "@trpc/server";
import { catererStaffProcedure, router } from "../../trpc";
import { idSchema } from "~~/shared/types";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { lookup } from "mime-types";
import {
	getCatererPermissionFilter,
	getDishPricePermissionFilter,
} from "../../utils/permissions";
import { putObject, deleteObject } from "../../../services/s3/local";

const dishSelect = {
	id: true,
	name_uk: true,
	name_en: true,
	weight: true,
	ingredients: true,
	notes: true,
	caterer_id: true,
	photo_id: true,
	valid_from: true,
	valid_to: true,
	Photo: { select: { id: true, path: true, type: true } },
	Prices: {
		select: { id: true, price: true, valid_from: true, valid_to: true },
		orderBy: { valid_from: "asc" as const },
	},
} as const;

const dishCreateFormSchema = zfd.formData(
	z.object({
		name_uk: z.string().min(1).max(200),
		name_en: z.string().min(1).max(200),
		weight: zfd.text(z.string().optional()),
		ingredients: z.string().optional(),
		notes: z.string().max(1000).optional(),
		valid_from: zfd.text(z.string().min(1)),
		valid_to: zfd.text(z.string().optional()),
		new_photo: zfd.file(z.instanceof(File).optional()),
	})
);

const dishUpdateFormSchema = zfd.formData(
	z.object({
		id: zfd.numeric(idSchema),
		name_uk: z.string().min(1).max(200).optional(),
		name_en: z.string().min(1).max(200).optional(),
		weight: zfd.text(z.string().optional()),
		ingredients: z.string().optional(),
		notes: z.string().max(1000).optional(),
		valid_from: zfd.text(z.string().optional()),
		valid_to: zfd.text(z.string().optional()),
		new_photo: zfd.file(z.instanceof(File).optional()),
		remove_photo: zfd.text(z.literal("true").optional()),
	})
);

const priceSchema = z.object({
	price: z.number().positive(),
	valid_from: z.coerce.date(),
	valid_to: z.coerce.date().optional().nullable(),
});

function dishPhotoKey(dishId: number) {
	return `dish-photos/${dishId}`;
}

async function savePhoto(
	dishId: number,
	file: File,
	staffId: number,
	existingPhotoId?: number | null
): Promise<number> {
	const key = dishPhotoKey(dishId);
	const bytes = Buffer.from(await file.arrayBuffer());
	const type =
		file.type || (lookup(file.name) as string) || "application/octet-stream";
	await putObject(key, bytes);
	const fileData = {
		name: file.name,
		path: key,
		type,
		size: bytes.length,
		provider: FileProvider.LOCAL_S3,
		uploader_caterer_staff_id: staffId,
	};
	if (existingPhotoId) {
		await writeClient.file.update({
			where: { id: existingPhotoId },
			data: { name: fileData.name, type: fileData.type, size: fileData.size },
		});
		return existingPhotoId;
	}
	const rec = await writeClient.file.create({
		data: fileData,
		select: { id: true },
	});
	return rec.id;
}

async function deletePhoto(photoId: number, dishId: number): Promise<void> {
	await deleteObject(dishPhotoKey(dishId)).catch(() => {});
	await writeClient.file.delete({ where: { id: photoId } }).catch(() => {});
}

export default router({
	list: catererStaffProcedure.query(async ({ ctx: { catererStaff } }) => {
		return await readClient.dish.findMany({
			where: getCatererPermissionFilter(catererStaff!.caterer_id),
			select: dishSelect,
			orderBy: { name_uk: "asc" },
		});
	}),

	create: catererStaffProcedure
		.input(dishCreateFormSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const dish = await writeClient.dish.create({
				data: {
					name_uk: input.name_uk,
					name_en: input.name_en,
					weight: input.weight ? Number(input.weight) : null,
					ingredients: input.ingredients
						? input.ingredients
								.split("\n")
								.map((s) => s.trim())
								.filter(Boolean)
						: [],
					notes: input.notes ?? null,
					caterer_id: catererStaff!.caterer_id,
					valid_from: new Date(input.valid_from),
					valid_to: input.valid_to ? new Date(input.valid_to) : null,
				},
				select: { id: true },
			});
			if (input.new_photo) {
				const photoId = await savePhoto(
					dish.id,
					input.new_photo,
					catererStaff!.id
				);
				return await writeClient.dish.update({
					where: { id: dish.id },
					data: { photo_id: photoId },
					select: dishSelect,
				});
			}
			return await readClient.dish.findUniqueOrThrow({
				where: { id: dish.id },
				select: dishSelect,
			});
		}),

	update: catererStaffProcedure
		.input(dishUpdateFormSchema)
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const dish = await readClient.dish.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true, Photo: { select: { id: true } } },
			});
			if (!dish)
				throw new TRPCError({ code: "NOT_FOUND", message: "Dish not found" });

			let photo_id: number | null | undefined = undefined;

			if (input.new_photo) {
				const newId = await savePhoto(
					input.id,
					input.new_photo,
					catererStaff!.id,
					dish.Photo?.id
				);
				if (!dish.Photo) photo_id = newId;
			} else if (input.remove_photo === "true" && dish.Photo) {
				await deletePhoto(dish.Photo.id, input.id);
				photo_id = null;
			}

			const {
				id,
				new_photo: _n,
				remove_photo: _r,
				weight,
				ingredients,
				notes,
				...rest
			} = input;
			return await writeClient.dish.update({
				where: { id },
				data: {
					...rest,
					...(weight !== undefined
						? { weight: weight ? Number(weight) : null }
						: {}),
					...(ingredients !== undefined
						? {
								ingredients: ingredients
									.split("\n")
									.map((s) => s.trim())
									.filter(Boolean),
							}
						: {}),
					...(notes !== undefined ? { notes: notes || null } : {}),
					valid_from: rest.valid_from ? new Date(rest.valid_from) : undefined,
					valid_to: rest.valid_to
						? new Date(rest.valid_to)
						: rest.valid_to === ""
							? null
							: undefined,
					...(photo_id !== undefined ? { photo_id } : {}),
				},
				select: dishSelect,
			});
		}),

	delete: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const dish = await readClient.dish.findFirst({
				where: {
					id: input.id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true, Photo: { select: { id: true } } },
			});
			if (!dish)
				throw new TRPCError({ code: "NOT_FOUND", message: "Dish not found" });
			if (dish.Photo) await deletePhoto(dish.Photo.id, input.id);
			await writeClient.dish.delete({ where: { id: input.id } });
			return { success: true };
		}),

	addPrice: catererStaffProcedure
		.input(z.object({ dish_id: idSchema, ...priceSchema.shape }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const dish = await readClient.dish.findFirst({
				where: {
					id: input.dish_id,
					...getCatererPermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!dish)
				throw new TRPCError({ code: "NOT_FOUND", message: "Dish not found" });
			return await writeClient.dishPrice.create({
				data: {
					dish_id: input.dish_id,
					price: input.price,
					valid_from: input.valid_from,
					valid_to: input.valid_to ?? null,
				},
				select: { id: true, price: true, valid_from: true, valid_to: true },
			});
		}),

	removePrice: catererStaffProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ input, ctx: { catererStaff } }) => {
			const price = await readClient.dishPrice.findFirst({
				where: {
					id: input.id,
					...getDishPricePermissionFilter(catererStaff!.caterer_id),
				},
				select: { id: true },
			});
			if (!price)
				throw new TRPCError({ code: "NOT_FOUND", message: "Price not found" });
			await writeClient.dishPrice.delete({ where: { id: input.id } });
			return { success: true };
		}),
});
