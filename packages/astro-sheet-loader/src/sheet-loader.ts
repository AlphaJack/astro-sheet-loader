// ┌───────────────────────────────────────────────────────────────┐
// │ Contents of sheet-loader.ts                                   │
// ├───────────────────────────────────────────────────────────────┘
// │
// ├── Imports
// ├──┐Functions
// │  ├── General
// │  ├── Schema
// │  ├── Loader
// │  └── Main
// │
// └───────────────────────────────────────────────────────────────

// ################################################################ Imports

import { AstroError } from "astro/errors";
import type { Loader, LoaderContext } from "astro/loaders";
import { type ZodRawShape, type ZodTypeAny, z } from "astro/zod";
import type {
	Cell,
	JSONData,
	ProcessContentOptions,
	ProcessHeaderOptions,
	SheetLoaderOptions,
	sheetSchemaToZodSchemaOptions,
} from "./types.js";

// ################################################################ Functions

// ################################ General

/**
 * Fetches JSON data from a Google Sheets document
 */
export async function sheetToJSON({ url }: { url: string }): Promise<JSONData> {
	const response = await fetchJSON(url);
	const text = await response.text();
	return parseJSON(text, url);
}

/**
 * Fetches the response from Google Sheets
 */
async function fetchJSON(url: string): Promise<Response> {
	return fetch(url).catch((error: Error) => {
		throw new AstroError(`Error fetching ${url}: ${error}`);
	});
}

/**
 * Parses the JSON response from Google Sheets
 */
async function parseJSON(text: string, url?: string): Promise<JSONData> {
	//const document = url?.split("/")[5];
	if (text.startsWith("<!DOCTYPE html>")) {
		throw new AstroError(
			`Error fetching JSON data for '${url}', check the ID and share settings of the document.`,
		);
	}
	let jsonObject: JSONData;
	const jsonString = text.slice(47, -2);
	try {
		jsonObject = JSON.parse(jsonString);
	} catch (error) {
		throw new AstroError(`Error parsing JSON data for '${url}': ${error}`);
	}
	if (jsonObject.status === "error") {
		throw new AstroError(
			`Error in JSON data for '${url}': ${jsonObject.errors?.[0]?.detailed_message ?? "Unknown error"}`,
		);
	}
	return jsonObject;
}

/**
 * Transform headers to camelCase.
 */
export const camelCase = (text: string | number): string => {
	return `${text}`
		.toLowerCase()
		.replace(/[-_]+/g, " ") // Replaces any - or _ characters with a space
		.replace(/[^\w\s]/g, "") // Removes any non alphanumeric characters
		.replace(/ (.)/g, ($1) => $1.toUpperCase()) // Uppercases the first character in each group immediately following a space
		.replace(/ /g, ""); // Removes spaces
};

/**
 * Transform headers to snake_case.
 */
export const snake_case = (text: string | number): string => {
	return (
		`${text}`.charAt(0).toLowerCase() +
		`${text}`
			.slice(1) // Lowercase the first character
			.replace(/\W+/g, " ") // Remove all excess white space and replace & , . etc.
			.replace(/([a-z])([A-Z])([a-z])/g, "$1 $2$3") // Put a space at the position of a camelCase -> camel Case
			.split(/\B(?=[A-Z]{2,})/) // Now split the multi-uppercases customerID -> customer,ID
			.join(" ") // And join back with spaces.
			.split(" ") // Split all the spaces again, this time we're fully converted
			.join("_") // And finally snake_case things up
			.toLowerCase()
	); // With a nice lower case
};

// ################################ Schema

/**
 * Associates a Sheet type to the equivalent Zod type.
 */
const SHEET_ZOD_TYPE_MAP = new Map<string, ZodTypeAny>([
	["boolean", z.boolean()],
	["number", z.number()],
	["string", z.string()],
	// google is not returning ISO 8601 UTC dates, so we avoid validating them
	["date", z.string()],
	["datetime", z.string()],
]);

/**
 * Converts the Sheet schema to a Zod schema.
 */
export async function sheetSchemaToZodSchema({
	cols,
	transformHeader = false,
	allowBlanks = false,
}: sheetSchemaToZodSchemaOptions): Promise<z.ZodObject<ZodRawShape>> {
	const schemaObject: Record<string, z.ZodTypeAny> = {};

	for (const column of cols) {
		const zodType = SHEET_ZOD_TYPE_MAP.get(column.type) ?? z.string();
		const columnName = transformHeader
			? transformHeader(column.label)
			: `${column.label}`;
		schemaObject[columnName] = allowBlanks
			? zodType.nullable().optional()
			: zodType;
		// debug
		//console.log(`${columnName}: ${column.type}`);
	}
	const zodSchema = z.object(schemaObject);
	return zodSchema;
}

// ################################ Loader

/**
 * Process header from json data
 */
function processHeader({
	cols,
	transformHeader,
	collection,
	logger,
}: ProcessHeaderOptions): string[] {
	// get header row to set column names
	const columns: string[] = [];
	for (const column of cols) {
		const columnName = transformHeader
			? transformHeader(column.label)
			: `${column.label}`;
		columns.push(columnName);
	}

	if (columns.every((column) => column.trim() === "")) {
		logger.error(
			`${collection}: Blank column names: | ${columns.join(" | ")} |`,
		);
		throw new AstroError("Error retrieving column names.");
	}

	return columns;
}

/**
 * Process rows from json data
 */
async function processContent({
	rows,
	columns,
	collection,
	logger,
	store,
	generateDigest,
	parseData,
}: ProcessContentOptions): Promise<void> {
	// parse content rows
	if (rows.length === 0) {
		logger.warn(`${collection}: No entry was loaded.`);
	} else {
		let rowID = 0;
		for (const row of rows) {
			logger.debug(`${collection}: Processing row ${rowID}`);
			const id = `row_${rowID}`;
			const rowData: Record<string, unknown> = {};
			row.c.forEach((c, index) => {
				const columnName = columns[index];
				if (!columnName) return;
				rowData[columnName] = valueOrFormat(c);
			});
			const parsedData = await parseData({ id, data: rowData }).catch(
				(error) => {
					logger.error(
						`${collection}: Error validating row ${rowID} (${JSON.stringify(row)}): ${error.message}`,
					);
					throw new AstroError("Error validating row data.");
				},
			);
			const digest = generateDigest(parsedData);
			logger.debug(`        Source data: ${rowData}`);
			logger.debug(`        Parsed data: ${parsedData}`);
			store.set({ id, data: parsedData, digest });
			rowID++;
		}
		logger.info(
			`${collection}: Loaded ${rows.length} entries with these ${columns.length} fields: | ${columns.join(" | ")} |`,
		);
	}
}

/**
 * Returns the value or formatted string of a cell based on its content.
 */
function valueOrFormat(c: Cell | null): string | number | boolean | undefined {
	// example ISO date: {v: 45402, f: "2024-04-20"}
	// example non-ISO date: {v: "Date(2024,3,20)", f: "4/20/2024"}
	// example time: {v: "Date(1899,11,30,5,54,0)", f: "5:54:00 AM"}
	const regexISODate = /^\d{4}-\d{2}-\d{2}$/;
	const regexFunDate = /^Date\(.*\)$/;
	if (!c) {
		return undefined;
	}
	if (c.v === null) {
		return undefined;
	}
	if (!c.f) {
		return c.v; // strings
	}
	if (Number.isInteger(c.v) && regexISODate.test(c.f)) {
		return c.f; // iso dates
	}
	if (regexFunDate.test(`${c.v}`)) {
		return c.f; // other time formats
	}
	return c.v; // numbers, booleans
}

// ################################ Main

/**
 * Loads data from a Google Sheets document into Astro
 */
export function sheetLoader({
	document,
	gid = 0,
	sheet = undefined,
	range = undefined,
	query = undefined,
	transformHeader = false,
	allowBlanks = false,
}: SheetLoaderOptions): Loader {
	const sheetParam = `&${sheet ? `sheet=${sheet}` : `gid=${gid}`}`;
	const rangeParam = range ? `&range=${range}` : "";
	const queryParam = query ? `&tq=${encodeURIComponent(query)}` : "";
	const url = `https://docs.google.com/spreadsheets/d/${document}/gviz/tq?tqx=out:json${sheetParam}${rangeParam}${queryParam}`;
	let cachedJson: JSONData | null = null;
	let autoSchema = false;
	return {
		name: "sheet-loader",
		load: async ({
			logger,
			parseData,
			generateDigest,
			store,
			collection,
		}: LoaderContext) => {
			if (!cachedJson) {
				cachedJson = await sheetToJSON({ url });
			}
			const json = cachedJson;
			logger.info(
				`${collection}: Loading ${url.replace(/tqx=out:json/, "tqx=out:html")}`,
			);

			const columns = processHeader({
				cols: json.table.cols,
				transformHeader,
				collection,
				logger,
			});
			return processContent({
				rows: json.table.rows,
				columns,
				collection,
				logger,
				store,
				generateDigest,
				parseData,
			});
		},
		schema: async () => {
			if (!cachedJson) {
				cachedJson = await sheetToJSON({ url });
			}
			const json: JSONData = cachedJson as JSONData;
			autoSchema = true;
			//console.log(json.table.cols);
			return sheetSchemaToZodSchema({
				cols: json.table.cols,
				transformHeader,
				allowBlanks,
			});
		},
	};
}
