import { readClient } from "prismaclient";
import { getObject } from "../../../services/s3/local";
import {
	getEventCatererStaff,
	getEventOrgStaff,
	getEventDiner,
	getEventGuardian,
} from "../../../trpc/trpc";

export default defineEventHandler(async (event) => {
	const id = Number(getRouterParam(event, "id"));
	if (!Number.isFinite(id) || id <= 0)
		throw createError({ statusCode: 400, statusMessage: "Invalid id" });

	const [catererStaff, orgStaff, diner, guardian] = await Promise.all([
		getEventCatererStaff(event),
		getEventOrgStaff(event),
		getEventDiner(event),
		getEventGuardian(event),
	]);

	let dishWhere: object | null = null;

	if (catererStaff) {
		dishWhere = { id, caterer_id: catererStaff.caterer_id };
	} else if (orgStaff) {
		dishWhere = {
			id,
			Caterer: {
				Contracts: { some: { organization_id: orgStaff.organization_id } },
			},
		};
	} else if (diner) {
		dishWhere = {
			id,
			Caterer: {
				Contracts: { some: { organization_id: diner.organization_id } },
			},
		};
	} else if (guardian) {
		dishWhere = {
			id,
			Caterer: {
				Contracts: {
					some: {
						Organization: {
							Diners: {
								some: { Guardians: { some: { guardian_id: guardian.id } } },
							},
						},
					},
				},
			},
		};
	} else {
		throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
	}

	const dish = await readClient.dish.findFirst({
		where: dishWhere,
		select: { Photo: { select: { path: true, type: true } } },
	});
	if (!dish?.Photo)
		throw createError({ statusCode: 404, statusMessage: "Not found" });

	const obj = await getObject(dish.Photo.path);
	setHeader(event, "Content-Type", dish.Photo.type);
	const bytes = await obj.Body!.transformToByteArray();
	return bytes;
});
