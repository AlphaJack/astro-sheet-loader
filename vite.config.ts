import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: ["**/node_modules/**", "**/dist/**", "demo/.astro/**"],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: ["**/node_modules/**", "**/dist/**", "test/fixtures/**", "demo/.astro/**"],
  },
  test: { include: ["test/**/*.test.ts"] },
});
