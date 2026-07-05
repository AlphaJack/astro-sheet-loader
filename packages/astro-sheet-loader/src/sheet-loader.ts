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
import type { LiveLoader, Loader, LoaderContext } from "astro/loaders";
import { type ZodRawShape, type ZodType, z } from "astro/zod";
import type {
	Cell,
	JSONData,
	ProcessContentOptions,
	ProcessHeaderOptions,
	Row,
	SheetLoaderOptions,
	sheetSchemaToZodSchemaOptions,
} from "./types.js";

// ################################################################ Functions

// ################################ General

/**
 * Builds the Google Sheets query URL from the loader options
 */
function buildSheetUrl(
	{
		document,
		gid = 0,
		sheet = undefined,
		range = undefined,
		query = undefined,
	}: SheetLoaderOptions,
	tqx = "out:json",
): string {
	const url = new URL(
		`https://docs.google.com/spreadsheets/d/${document}/gviz/tq`,
	);
	url.searchParams.set("tqx", tqx);
	if (sheet) {
		url.searchParams.set("sheet", sheet);
	} else {
		url.searchParams.set("gid", `${gid}`);
	}
	if (range) {
		url.searchParams.set("range", range);
	}
	if (query) {
		url.searchParams.set("tq", query);
	}
	return url.toString();
}

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
	if (/^\s*</.test(text)) {
		throw new AstroError(
			`Error fetching JSON data for '${url}', check the ID and share settings of the document.`,
		);
	}
	// responses look like "/*O_o*/\ngoogle.visualization.Query.setResponse({...});"
	const match = text.match(
		/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/,
	);
	const jsonString = match?.[1];
	if (jsonString === undefined) {
		throw new AstroError(
			`Unexpected Google Visualization response format for '${url}'.`,
		);
	}
	let jsonObject: JSONData;
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
 * Normalizes a thrown value to an Error, as live loaders return errors instead of throwing
 */
function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(`${error}`);
}

/**
 * Transforms headers to camelCase
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
 * Transforms headers to snake_case
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
 * Associates a Sheet type to the equivalent Zod type
 */
const SHEET_ZOD_TYPE_MAP = new Map<string, ZodType>([
	["boolean", z.boolean()],
	["number", z.number()],
	["string", z.string()],
	// google is not returning ISO 8601 UTC dates, so we avoid validating them
	["date", z.string()],
	["datetime", z.string()],
]);

/**
 * Returns a predicate telling whether a column may be blank, validating the `allowBlanks` list
 */
function blankAllowedPredicate(
	allowBlanks: boolean | string[],
	columnNames: string[],
): (columnName: string) => boolean {
	if (Array.isArray(allowBlanks)) {
		const unknown = allowBlanks.filter((name) => !columnNames.includes(name));
		if (unknown.length > 0) {
			throw new AstroError(
				`Columns allowed to be blank not found: | ${unknown.join(" | ")} |, available columns: | ${columnNames.join(" | ")} |`,
			);
		}
		const allowed = new Set(allowBlanks);
		return (columnName) => allowed.has(columnName);
	}
	return () => allowBlanks;
}

/**
 * Converts the Sheet schema to a Zod schema
 */
export function sheetSchemaToZodSchema({
	cols,
	transformHeader = false,
	allowBlanks = false,
}: sheetSchemaToZodSchemaOptions): z.ZodObject<ZodRawShape> {
	const schemaObject: Record<string, ZodType> = {};
	const isBlankAllowed = blankAllowedPredicate(
		allowBlanks,
		getColumnNames({ cols, transformHeader }),
	);

	for (const column of cols) {
		const zodType = SHEET_ZOD_TYPE_MAP.get(column.type) ?? z.string();
		const columnName = transformHeader
			? transformHeader(column.label)
			: `${column.label}`;
		schemaObject[columnName] = isBlankAllowed(columnName)
			? zodType.nullable().optional()
			: zodType;
	}
	const zodSchema = z.object(schemaObject);
	return zodSchema;
}

/**
 * Associates a Sheet type to the equivalent TypeScript type
 */
const SHEET_TS_TYPE_MAP = new Map<string, string>([
	["boolean", "boolean"],
	["number", "number"],
	["string", "string"],
	// google is not returning ISO 8601 UTC dates, so we treat them as strings
	["date", "string"],
	["datetime", "string"],
]);

/**
 * Converts the Sheet schema to TypeScript declarations, as required by `createSchema()`
 */
export function sheetSchemaToTypes({
	cols,
	transformHeader = false,
	allowBlanks = false,
}: sheetSchemaToZodSchemaOptions): string {
	const fields: string[] = [];
	const isBlankAllowed = blankAllowedPredicate(
		allowBlanks,
		getColumnNames({ cols, transformHeader }),
	);

	for (const column of cols) {
		const tsType = SHEET_TS_TYPE_MAP.get(column.type) ?? "string";
		const columnName = transformHeader
			? transformHeader(column.label)
			: `${column.label}`;
		fields.push(
			isBlankAllowed(columnName)
				? `\t${JSON.stringify(columnName)}?: ${tsType} | null;`
				: `\t${JSON.stringify(columnName)}: ${tsType};`,
		);
	}
	return `export type Entry = {\n${fields.join("\n")}\n};\n`;
}

// ################################ Loader

/**
 * Computes the column names from the header row
 */
function getColumnNames({
	cols,
	transformHeader,
}: Pick<ProcessHeaderOptions, "cols" | "transformHeader">): string[] {
	return cols.map((column) =>
		transformHeader ? transformHeader(column.label) : `${column.label}`,
	);
}

/**
 * Processes the header from JSON data, erroring if all column names are blank
 */
function processHeader({
	cols,
	transformHeader,
	collection,
	logger,
}: ProcessHeaderOptions): string[] {
	// get header row to set column names
	const columns = getColumnNames({ cols, transformHeader });

	if (columns.every((column) => column.trim() === "")) {
		logger.error(
			`${collection}: Blank column names: | ${columns.join(" | ")} |`,
		);
		throw new AstroError("Error retrieving column names.");
	}

	return columns;
}

/**
 * Maps the cells of a row to their column names
 */
function rowToData(row: Row, columns: string[]): Record<string, unknown> {
	const rowData: Record<string, unknown> = {};
	row.c.forEach((cell, index) => {
		const columnName = columns[index];
		if (!columnName) return;
		rowData[columnName] = valueOrFormat(cell);
	});
	return rowData;
}

/**
 * Converts content rows to entries, each with a unique ID
 */
function rowsToEntries({
	rows,
	columns,
	idColumn,
}: {
	rows: Row[];
	columns: string[];
	idColumn?: string;
}): { id: string; data: Record<string, unknown> }[] {
	if (idColumn && !columns.includes(idColumn)) {
		throw new AstroError(
			`ID column '${idColumn}' not found among these columns: | ${columns.join(" | ")} |`,
		);
	}
	const seenIds = new Set<string>();
	return rows.map((row, rowIndex) => {
		const data = rowToData(row, columns);
		let id = `row_${rowIndex}`;
		if (idColumn) {
			const value = data[idColumn];
			if (value === undefined || value === null || `${value}`.trim() === "") {
				throw new AstroError(
					`Row ${rowIndex} has no value for ID column '${idColumn}'.`,
				);
			}
			id = `${value}`;
			if (seenIds.has(id)) {
				throw new AstroError(
					`Row ${rowIndex} has a duplicate value '${id}' for ID column '${idColumn}'.`,
				);
			}
			seenIds.add(id);
		}
		return { id, data };
	});
}

/**
 * Processes rows from JSON data, storing them as entries and removing
 * entries whose rows are no longer in the sheet
 */
async function processContent({
	rows,
	columns,
	idColumn,
	collection,
	logger,
	store,
	generateDigest,
	parseData,
}: ProcessContentOptions): Promise<void> {
	// parse content rows
	if (rows.length === 0) {
		logger.warn(`${collection}: No entry was loaded.`);
		store.clear();
		return;
	}
	const entries = rowsToEntries({ rows, columns, idColumn });
	for (const { id, data } of entries) {
		logger.debug(`${collection}: Processing entry ${id}`);
		const parsedData = await parseData({ id, data }).catch((error) => {
			logger.error(
				`${collection}: Error validating entry ${id} (${JSON.stringify(data)}): ${error.message}`,
			);
			throw new AstroError("Error validating row data.");
		});
		const digest = generateDigest(parsedData);
		store.set({ id, data: parsedData, digest });
	}
	// remove entries whose rows are no longer in the sheet
	const currentIds = new Set(entries.map((entry) => entry.id));
	for (const id of store.keys()) {
		if (!currentIds.has(id)) {
			store.delete(id);
		}
	}
	logger.info(
		`${collection}: Loaded ${rows.length} entries with these ${columns.length} fields: | ${columns.join(" | ")} |`,
	);
}

/**
 * Returns the value or formatted string of a cell based on its content
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
 * Loads data from a publicly viewable Google Sheets document into Astro at build time.
 *
 * Entries are validated against the schema defined on the collection, or against
 * a schema derived from the sheet columns if none is provided.
 *
 * @example
 * ```typescript
 * // src/content.config.ts
 * const crm = defineCollection({
 *   loader: sheetLoader({
 *     document: "1XXXXXXXXXXXX",
 *     transformHeader: camelCase,
 *     idColumn: "id",
 *   }),
 * });
 * ```
 */
export function sheetLoader(options: SheetLoaderOptions): Loader {
	const { transformHeader = false, allowBlanks = false, idColumn } = options;
	const url = buildSheetUrl(options);
	let cachedJson: JSONData | null = null;
	const checkOptions = () => {
		if (
			idColumn &&
			Array.isArray(allowBlanks) &&
			allowBlanks.includes(idColumn)
		) {
			throw new AstroError(
				`ID column '${idColumn}' cannot be allowed to be blank.`,
			);
		}
	};
	return {
		name: "sheet-loader",
		load: async ({
			logger,
			parseData,
			generateDigest,
			store,
			collection,
		}: LoaderContext) => {
			checkOptions();
			// always fetch fresh data, so that reloads in dev mode pick up sheet changes
			cachedJson = await sheetToJSON({ url });
			const json = cachedJson;
			logger.info(
				`${collection}: Loading ${buildSheetUrl(options, "out:html")}`,
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
				idColumn,
				collection,
				logger,
				store,
				generateDigest,
				parseData,
			});
		},
		createSchema: async () => {
			checkOptions();
			// reuse the data fetched by load() when available
			if (!cachedJson) {
				cachedJson = await sheetToJSON({ url });
			}
			const json: JSONData = cachedJson;
			return {
				schema: sheetSchemaToZodSchema({
					cols: json.table.cols,
					transformHeader,
					allowBlanks,
				}),
				types: sheetSchemaToTypes({
					cols: json.table.cols,
					transformHeader,
					allowBlanks,
				}),
			};
		},
	};
}

/**
 * Loads data from a publicly viewable Google Sheets document at request time,
 * for live collections. Requires an on-demand rendering adapter.
 *
 * Errors are returned as values instead of being thrown, and entries are not
 * validated against a schema, so `allowBlanks` is ignored.
 *
 * @example
 * ```typescript
 * // src/live.config.ts
 * const crm = defineLiveCollection({
 *   loader: sheetLiveLoader({
 *     document: "1XXXXXXXXXXXX",
 *     idColumn: "Name",
 *   }),
 * });
 * ```
 */
export function sheetLiveLoader(
	options: SheetLoaderOptions,
): LiveLoader<Record<string, unknown>, { id: string }> {
	const { transformHeader = false, idColumn } = options;
	const url = buildSheetUrl(options);

	const loadEntries = async () => {
		const json = await sheetToJSON({ url });
		const columns = getColumnNames({ cols: json.table.cols, transformHeader });
		if (columns.every((column) => column.trim() === "")) {
			throw new AstroError("Error retrieving column names.");
		}
		return rowsToEntries({ rows: json.table.rows, columns, idColumn });
	};

	return {
		name: "sheet-live-loader",
		loadCollection: async () => {
			try {
				return { entries: await loadEntries() };
			} catch (error) {
				return { error: toError(error) };
			}
		},
		loadEntry: async ({ filter }) => {
			try {
				const entries = await loadEntries();
				return entries.find((entry) => entry.id === filter.id);
			} catch (error) {
				return { error: toError(error) };
			}
		},
	};
}
