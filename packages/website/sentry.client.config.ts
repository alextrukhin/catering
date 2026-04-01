import * as Sentry from "@sentry/nuxt";

const config = useRuntimeConfig();
const APP_ENV = config.public.APP_ENV;

Sentry.init({
	enabled: !!APP_ENV && APP_ENV !== "dev",

	environment: config.public.APP_ENV,

	dsn: config.public.SENTRY_DSN,

	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: 0.1,

	// If the entire session is not sampled, use the below sample rate to sample
	// sessions when an error occurs.
	replaysOnErrorSampleRate: 1.0,

	// If you don't want to use Session Replay, just remove the line below:
	integrations: [
		Sentry.replayIntegration({
			maskAllText: false,
			maskAllInputs: false,
		}),
	],

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: false,
});
