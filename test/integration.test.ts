/*

Needs `astro build` output for the demo, so it is skipped unless TEST_ONLINE is set.
Run it with `npm run test:online`.

*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe.runIf(process.env.TEST_ONLINE)("Astro (Online)", () => {
	it("should retrieve and display data from different Sheets", () => {
		// Define the file path
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const filePath = path.join(__dirname, "../demo/dist/index.html");
		const content = fs.readFileSync(filePath, "utf-8");
		// checks
		expect(content).toContain("-columns");
		expect(content).toContain("row_0");
		// test camelCase header transformation
		expect(content).toContain("contactedBy");
		// test snake_case header transformation
		expect(content).toContain("closing_hour");
	});
});
