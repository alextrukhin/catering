import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

if (import.meta.prerender) {
	console.info("Skipping PrismaClient creation in prerender");
}

function createClient(connectionString: string | undefined) {
	const base = new PrismaClient({
		adapter: new PrismaPg({ connectionString }),
		log: [{ emit: "event", level: "query" }, "info", "warn", "error"],
	});
	if (false)
		base.$on("query", (_e) => {
			console.log("Query: " + _e.query);
			console.log("Duration: " + _e.duration + "ms");
			console.log("Params: " + _e.params);
		});
	return base;
}

// In prerender mode we expose typed nulls so server-only imports don't crash
// the prerender build.  The real clients are created at runtime only.
type PostgisClient = ReturnType<typeof createClient>;

export const readClient = import.meta.prerender
	? (null as unknown as PostgisClient)
	: createClient(process.env.READ_DATABASE_URL);

export const writeClient = import.meta.prerender
	? (null as unknown as PostgisClient)
	: createClient(process.env.WRITE_DATABASE_URL);

export * from "./generated/client";
