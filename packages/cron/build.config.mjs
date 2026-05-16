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
				// Bundle prismaclient (workspace dep, resolves outside node_modules) inline.
				// For resolved absolute paths, externalize only if they come from node_modules.
				// For unresolved specifiers, externalize all npm package names.
				external: (id, _importer, isResolved) => {
					if (isResolved) {
						return id.includes("node_modules");
					}
					if (id === "prismaclient") return false;
					if (id.startsWith(".")) return false;
					return true;
				},
			},
		},
	],
});
