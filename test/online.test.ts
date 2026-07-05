/*

Tests hitting the live Google Sheets API, skipped unless TEST_ONLINE is set.
Run them with `npm run test:online`.

*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sheetToJSON } from "astro-sheet-loader";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const document1 = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

const documentUrl1 = `https://docs.google.com/spreadsheets/d/${document1}/gviz/tq?tqx=out:json`;

describe.runIf(process.env.TEST_ONLINE)("Fetch (Online)", () => {
	it("should fetch the same json as the recorded fixture", async () => {
		const expected_json = JSON.parse(
			fs.readFileSync(
				path.join(__dirname, "fixtures/students.expected.json"),
				"utf-8",
			),
		);
		const fetched_json = await sheetToJSON({ url: documentUrl1 });
		expect(fetched_json).toEqual(expected_json);
	});
});
