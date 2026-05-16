const isDev = process.env.NUXT_PUBLIC_APP_ENV === "dev";

const modules = [
	"@nuxt/eslint",
	"@nuxt/ui",
	"@vueuse/nuxt",
	"@nuxtjs/color-mode",
	"@nuxtjs/i18n",
];
if (!isDev) {
	modules.push("@sentry/nuxt/module");
}

export default defineNuxtConfig({
	ssr: false,

	modules,

	i18n: {
		strategy: "no_prefix",
		defaultLocale: "uk",
		langDir: "locales",
		locales: [
			{ code: "en", name: "English", file: "en.json" },
			{ code: "uk", name: "Українська", file: "uk.json" },
		],
		vueI18n: "./i18n.config.ts",
	},

	runtimeConfig: {
		public: {
			APP_VERSION: process.env.APP_VERSION || "dev",
			s3Url: process.env.NUXT_PUBLIC_S3_URL || "",
		},
		REDIS_URL: process.env.NUXT_REDIS_URL,
		SENTRY_DSN: process.env.NUXT_PUBLIC_SENTRY_DSN || "",
	},

	app: {
		head: {
			script: [{ src: "https://telegram.org/js/telegram-web-app.js" }],
		},
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

	experimental: {
		viteEnvironmentApi: true,
	},

	compatibilityDate: "2026-05-14",
});
