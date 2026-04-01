import { initTRPC, TRPCError } from "@trpc/server";
import jsonwebtoken from "jsonwebtoken";
import type { H3Event } from "h3";
import { readClient, CatererStaffType, OrgStaffType } from "prismaclient";

type JWTPayload = { id: number; email: string; iat: number; exp: number };

const decodeJWT = (event: H3Event, cookieName: string) => {
	try {
		const token = getCookie(event, cookieName);
		if (!token) return null;
		return jsonwebtoken.verify(token, process.env.JWT_SECRET!) as JWTPayload;
	} catch {
		return null;
	}
};

const makeGetUser =
	<T>(cookieName: string, fetch: (id: number) => Promise<T | null>) =>
	async (event: H3Event) => {
		try {
			const payload = decodeJWT(event, cookieName);
			if (!payload) return null;
			return await fetch(payload.id);
		} catch (e) {
			console.warn(e);
			return null;
		}
	};

const staffSelect = {
	id: true,
	email: true,
	first_name: true,
	middle_name: true,
	last_name: true,
	type: true,
} as const;

const personSelect = {
	id: true,
	email: true,
	first_name: true,
	middle_name: true,
	last_name: true,
} as const;

export const getEventOrgStaff = makeGetUser("jwt_org", (id) =>
	readClient.orgStaff.findUnique({ where: { id }, select: staffSelect })
);
export const getEventCatererStaff = makeGetUser("jwt_caterer", (id) =>
	readClient.catererStaff.findUnique({ where: { id }, select: staffSelect })
);
export const getEventDiner = makeGetUser("jwt_diner", (id) =>
	readClient.diner.findUnique({ where: { id }, select: personSelect })
);
export const getEventGuardian = makeGetUser("jwt_guardian", (id) =>
	readClient.guardian.findUnique({ where: { id }, select: personSelect })
);

type OrgStaffCtx = Awaited<ReturnType<typeof getEventOrgStaff>>;
type CatererStaffCtx = Awaited<ReturnType<typeof getEventCatererStaff>>;
type DinerCtx = Awaited<ReturnType<typeof getEventDiner>>;
type GuardianCtx = Awaited<ReturnType<typeof getEventGuardian>>;

export type TRPCContext = {
	event: H3Event;
	orgStaff: OrgStaffCtx;
	catererStaff: CatererStaffCtx;
	diner: DinerCtx;
	guardian: GuardianCtx;
};

const t = initTRPC.context<TRPCContext>().create();

export const publicProcedure = t.procedure;

export const withOptionalOrgStaffProcedure = publicProcedure.use(
	async ({ ctx, next }) =>
		next({ ctx: { orgStaff: await getEventOrgStaff(ctx.event) } })
);
export const orgStaffProcedure = withOptionalOrgStaffProcedure.use(
	async ({ ctx, next }) => {
		if (!ctx.orgStaff)
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You are not logged in",
			});
		return next({ ctx });
	}
);
export const orgStaffAdminProcedure = orgStaffProcedure.use(
	async ({ ctx, next }) => {
		if (ctx.orgStaff!.type !== OrgStaffType.ADMIN)
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You are not allowed to view this data",
			});
		return next({ ctx });
	}
);

export const publicWithOptionalCatererStaffProcedure = publicProcedure.use(
	async ({ ctx, next }) =>
		next({ ctx: { catererStaff: await getEventCatererStaff(ctx.event) } })
);
export const catererStaffProcedure =
	publicWithOptionalCatererStaffProcedure.use(async ({ ctx, next }) => {
		if (!ctx.catererStaff)
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You are not logged in",
			});
		return next({ ctx });
	});
export const catererStaffAdminProcedure = catererStaffProcedure.use(
	async ({ ctx, next }) => {
		if (ctx.catererStaff!.type !== CatererStaffType.ADMIN)
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You are not allowed to view this data",
			});
		return next({ ctx });
	}
);

export const withOptionalDinerProcedure = publicProcedure.use(
	async ({ ctx, next }) =>
		next({ ctx: { diner: await getEventDiner(ctx.event) } })
);
export const dinerProcedure = withOptionalDinerProcedure.use(
	async ({ ctx, next }) => {
		if (!ctx.diner)
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You are not logged in",
			});
		return next({ ctx });
	}
);

export const withOptionalGuardianProcedure = publicProcedure.use(
	async ({ ctx, next }) =>
		next({ ctx: { guardian: await getEventGuardian(ctx.event) } })
);
export const guardianProcedure = withOptionalGuardianProcedure.use(
	async ({ ctx, next }) => {
		if (!ctx.guardian)
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You are not logged in",
			});
		return next({ ctx });
	}
);

export const router = t.router;
export const middleware = t.middleware;
