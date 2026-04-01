import * as Sentry from "@sentry/nuxt";
import dotenv from "dotenv";

dotenv.config();

const APP_ENV = process.env.NUXT_PUBLIC_APP_ENV || "production";

Sentry.init({
	enabled: !!(APP_ENV && APP_ENV !== "dev"),

	environment: APP_ENV,

	dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,

	debug: false,
});
