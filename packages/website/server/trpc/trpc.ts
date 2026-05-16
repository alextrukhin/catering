import { initTRPC, TRPCError } from "@trpc/server";
import jsonwebtoken from "jsonwebtoken";
import type { H3Event } from "h3";
import { readClient, CatererStaffType, OrgStaffType } from "prismaclient";

type SessionPayload = { session_id: number; iat: number; exp: number };

const resolveSession = async <T>(
	event: H3Event,
	cookieName: string,
	entity: string,
	fetch: (entity_id: number) => Promise<T | null>
): Promise<T | null> => {
	try {
		const token = getCookie(event, cookieName);
		if (!token) return null;
		const { session_id } = jsonwebtoken.verify(
			token,
			process.env.JWT_SECRET!
		) as SessionPayload;
		const session = session_id
			? await readClient.session.findUnique({
					where: { id: session_id },
				})
			: null;
		if (!session || session.entity !== entity || session.ended_at !== null)
			return null;
		return await fetch(session.entity_id);
	} catch {
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

const orgStaffSelect = {
	...staffSelect,
	organization_id: true,
} as const;

const catererStaffSelect = {
	...staffSelect,
	caterer_id: true,
} as const;

const personSelect = {
	id: true,
	phone: true,
	first_name: true,
	middle_name: true,
	last_name: true,
	organization_id: true,
} as const;

export const getEventOrgStaff = (event: H3Event) =>
	resolveSession(event, "jwt_org", "org_staff", (id) =>
		readClient.orgStaff.findUnique({ where: { id }, select: orgStaffSelect })
	);
export const getEventCatererStaff = (event: H3Event) =>
	resolveSession(event, "jwt_caterer", "caterer_staff", (id) =>
		readClient.catererStaff.findUnique({
			where: { id },
			select: catererStaffSelect,
		})
	);
export const getEventDiner = (event: H3Event) =>
	resolveSession(event, "jwt_diner", "diner", (id) =>
		readClient.diner.findUnique({ where: { id }, select: personSelect })
	);
export const getEventGuardian = (event: H3Event) =>
	resolveSession(event, "jwt_guardian", "guardian", (id) =>
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
