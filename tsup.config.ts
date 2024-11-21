import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	outDir: "dist",
	target: "esnext",
	format: ["esm"],
	dts: true,
	splitting: false,
	sourcemap: true,
	clean: true,
});
