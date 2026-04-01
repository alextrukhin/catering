const isDev = process.env.NUXT_PUBLIC_APP_ENV === "dev";

const modules = [
	"@nuxt/eslint",
	"@nuxt/ui",
	"@vueuse/nuxt",
	"@nuxtjs/color-mode",
];
if (!isDev) {
	modules.push("@sentry/nuxt/module");
}

export default defineNuxtConfig({
	modules,

	runtimeConfig: {
		public: {
			APP_VERSION: process.env.APP_VERSION || "dev",
		},
		REDIS_URL: process.env.NUXT_REDIS_URL,
		SENTRY_DSN: process.env.NUXT_PUBLIC_SENTRY_DSN || "",
	},

	devtools: false,

	css: ["~/assets/css/main.css"],

	build: {
		transpile: ["trpc-nuxt"],
	},

	sourcemap: {
		server: isDev,
		client: isDev,
	},

	compatibilityDate: "2026-03-22",
});
