import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
	entries: [
		{
			type: "bundle",
			input: ["./index.ts"],
			outDir: "./dist",
			dts: false,
			rolldown: {
				platform: "node",
				external: () => false,
			},
		},
	],
});
