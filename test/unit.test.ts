import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	camelCase,
	sheetSchemaToTypes,
	sheetSchemaToZodSchema,
	sheetToJSON,
	snake_case,
} from "astro-sheet-loader";
import { z } from "astro/zod";
import { afterEach, describe, expect, it, vi } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const document1 = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

const documentUrl1 = `https://docs.google.com/spreadsheets/d/${document1}/gviz/tq?tqx=out:json`;

const expected_json1 = JSON.parse(
	fs.readFileSync(
		path.join(__dirname, "fixtures/students.expected.json"),
		"utf-8",
	),
);

const jsonCols1 = JSON.parse(
	`[
  {"id":"A","label":"ID","type":"number","pattern":"General"},
  {"id":"B","label":"Name","type":"string"},
  {"id":"C","label":"Age","type":"number","pattern":"General"},
  {"id":"D","label":"Birthday","type":"date","pattern":"M/d/yyyy"},
  {"id":"F","label":"Life Remaining","type":"number","pattern":"0.00%"},
  {"id":"G","label":"Last Hug Received","type":"datetime","pattern":"h:mm:ss am/pm"}
  ]`,
);

const zodCols1Base = z.object({
	ID: z.number().optional(),
	Name: z.string().optional(),
	Age: z.number().optional(),
	Birthday: z.date().optional(),
	"Life Remaining": z.number().optional(),
	"Last Hug Received": z.date().optional(),
});

const zodCols1Strict = z.object({
	ID: z.number(),
	Name: z.string(),
	Age: z.number(),
	Birthday: z.date(),
	"Life Remaining": z.number(),
	"Last Hug Received": z.date(),
});

describe("Schema", () => {
	it("should generate a zod schema with optional values", () => {
		const generatedSchema = sheetSchemaToZodSchema({ cols: jsonCols1 });
		expect(generatedSchema.isOptional()).toEqual(zodCols1Base.isOptional());
		expect(generatedSchema.shape["Last Hug Received"]).toBeTruthy();
	});

	it("should generate a zod schema with mandatory values", () => {
		const generatedSchema = sheetSchemaToZodSchema({
			cols: jsonCols1,
			allowBlanks: false,
		});
		expect(generatedSchema.shape.Birthday.isOptional()).toEqual(
			zodCols1Strict.shape.Birthday.isOptional(),
		);
		expect(generatedSchema.shape.Birthday.isOptional()).toEqual(false);
		expect(generatedSchema.shape.Age.isOptional()).toBeFalsy();
	});

	it("should generate a zod schema with camel case entries", () => {
		const generatedSchema = sheetSchemaToZodSchema({
			cols: jsonCols1,
			allowBlanks: false,
			transformHeader: camelCase,
		});
		expect(generatedSchema.shape.lastHugReceived).toBeTruthy();
		expect(generatedSchema.shape["Last Hug Received"]).toBeFalsy();
	});

	it("should generate TypeScript types", () => {
		const types = sheetSchemaToTypes({
			cols: jsonCols1,
			allowBlanks: true,
			transformHeader: camelCase,
		});
		expect(types).toContain("export type Entry");
		expect(types).toContain('"id"?: number | null;');
		expect(types).toContain('"lastHugReceived"?: string | null;');
	});

	it("should generate TypeScript types with mandatory values", () => {
		const types = sheetSchemaToTypes({ cols: jsonCols1 });
		expect(types).toContain('"ID": number;');
		expect(types).toContain('"Last Hug Received": string;');
	});
});

describe("Fetch (Offline)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should parse a recorded response", async () => {
		const fixture = fs.readFileSync(
			path.join(__dirname, "fixtures/students.jsonp.txt"),
			"utf-8",
		);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(fixture)),
		);
		const fetched_json = await sheetToJSON({ url: documentUrl1 });
		expect(fetched_json).toEqual(expected_json1);
	});

	it("should throw on a HTML response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("<!DOCTYPE html><html></html>")),
		);
		await expect(sheetToJSON({ url: documentUrl1 })).rejects.toThrow(
			"share settings",
		);
	});

	it("should throw on an unexpected response format", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("window.unexpectedHandler({});")),
		);
		await expect(sheetToJSON({ url: documentUrl1 })).rejects.toThrow(
			"Unexpected Google Visualization response format",
		);
	});
});

describe("camelCase", () => {
	it("should convert string to camelCase", () => {
		expect(camelCase("first name")).toBe("firstName");
		expect(camelCase("Last Name")).toBe("lastName");
		expect(camelCase("last_name")).toBe("lastName");
		expect(camelCase(4)).toBe("4");
		expect(camelCase("email_address")).toBe("emailAddress");
		expect(camelCase("Phone_Number")).toBe("phoneNumber");
		expect(camelCase("user-id")).toBe("userId");
		expect(camelCase("Order-Number")).toBe("orderNumber");
		expect(camelCase("Customer ID")).toBe("customerId");
		expect(camelCase("Customer id")).toBe("customerId");
	});

	it("should handle empty strings", () => {
		expect(camelCase("")).toBe("");
	});

	it("should handle single words", () => {
		expect(camelCase("username")).toBe("username");
		expect(camelCase("Username")).toBe("username");
	});
});

describe("snake_case", () => {
	it("should convert string to snake_case", () => {
		expect(snake_case("first name")).toBe("first_name");
		expect(snake_case("Last Name")).toBe("last_name");
		expect(snake_case("emailAddress")).toBe("email_address");
		expect(snake_case(3)).toBe("3");
		expect(snake_case("user-id")).toBe("user_id");
		expect(snake_case("OrderNumber")).toBe("order_number");
		expect(snake_case("Customer ID")).toBe("customer_id");
		expect(snake_case("Customer id")).toBe("customer_id");
	});

	it("should handle empty strings", () => {
		expect(snake_case("")).toBe("");
	});

	it("should handle single words", () => {
		expect(snake_case("username")).toBe("username");
		expect(snake_case("Username")).toBe("username");
	});
});
