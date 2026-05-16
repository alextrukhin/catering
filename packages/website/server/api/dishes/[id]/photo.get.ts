import { readClient } from "prismaclient";
import { getObject } from "../../../services/s3/local";
import { getEventCatererStaff } from "../../../trpc/trpc";

export default defineEventHandler(async (event) => {
	const catererStaff = await getEventCatererStaff(event);
	if (!catererStaff)
		throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

	const id = Number(getRouterParam(event, "id"));
	if (!Number.isFinite(id) || id <= 0)
		throw createError({ statusCode: 400, statusMessage: "Invalid id" });

	const dish = await readClient.dish.findFirst({
		where: { id, caterer_id: catererStaff.caterer_id },
		select: { Photo: { select: { path: true, type: true } } },
	});
	if (!dish?.Photo)
		throw createError({ statusCode: 404, statusMessage: "Not found" });

	const obj = await getObject(dish.Photo.path);
	setHeader(event, "Content-Type", dish.Photo.type);
	const bytes = await obj.Body!.transformToByteArray();
	return bytes;
});
