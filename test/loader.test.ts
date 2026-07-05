import { sheetLiveLoader, sheetLoader } from "astro-sheet-loader";
import type { Loader, LoaderContext } from "astro/loaders";
import { afterEach, describe, expect, it, vi } from "vitest";

// wraps a table in the JSONP envelope used by real Google Sheets responses
function gvizResponse(cols: object[], rows: object[]): string {
	const json = {
		version: "0.6",
		reqId: "0",
		status: "ok",
		sig: "0",
		table: { cols, rows },
	};
	return `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify(json)});`;
}

const cols = [
	{ id: "A", label: "Name", type: "string" },
	{ id: "B", label: "Age", type: "number" },
];

const rows = [
	{ c: [{ v: "Ada" }, { v: 36 }] },
	{ c: [{ v: "Grace" }, { v: 45 }] },
	{ c: [{ v: "Alan" }, { v: 41 }] },
];

function stubFetch(...bodies: string[]) {
	const mock = vi.fn();
	for (const body of bodies) {
		mock.mockResolvedValueOnce(new Response(body));
	}
	vi.stubGlobal("fetch", mock);
	return mock;
}

// minimal LoaderContext backed by a Map, standing in for the Astro data store
function mockContext() {
	const entries = new Map<
		string,
		{ id: string; data: Record<string, unknown>; digest?: string }
	>();
	const noop = () => {};
	const context = {
		collection: "test",
		store: {
			get: (key: string) => entries.get(key),
			set: (entry: {
				id: string;
				data: Record<string, unknown>;
				digest?: string;
			}) => {
				entries.set(entry.id, entry);
				return true;
			},
			entries: () => [...entries.entries()],
			values: () => [...entries.values()],
			keys: () => [...entries.keys()],
			delete: (key: string) => entries.delete(key),
			clear: () => entries.clear(),
			has: (key: string) => entries.has(key),
			addModuleImport: noop,
		},
		meta: { get: () => undefined, set: noop, has: () => false, delete: noop },
		logger: { info: noop, warn: noop, error: noop, debug: noop },
		parseData: async ({
			data,
		}: { id: string; data: Record<string, unknown> }) => data,
		generateDigest: (data: Record<string, unknown> | string) =>
			JSON.stringify(data),
	} as unknown as LoaderContext;
	return { context, entries };
}

// the Loader type is a union, so createSchema needs to be narrowed for direct calls
type SchemaLoader = Loader & {
	createSchema: () => Promise<{ schema: unknown; types: string }>;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("sheetLoader", () => {
	it("should store entries with positional IDs", async () => {
		stubFetch(gvizResponse(cols, rows));
		const { context, entries } = mockContext();
		await sheetLoader({ document: "test" }).load(context);
		expect([...entries.keys()]).toEqual(["row_0", "row_1", "row_2"]);
		expect(entries.get("row_0")?.data).toEqual({ Name: "Ada", Age: 36 });
	});

	it("should store entries with IDs taken from idColumn", async () => {
		stubFetch(gvizResponse(cols, rows));
		const { context, entries } = mockContext();
		await sheetLoader({ document: "test", idColumn: "Name" }).load(context);
		expect([...entries.keys()]).toEqual(["Ada", "Grace", "Alan"]);
	});

	it("should reject an unknown idColumn", async () => {
		stubFetch(gvizResponse(cols, rows));
		const { context } = mockContext();
		await expect(
			sheetLoader({ document: "test", idColumn: "Missing" }).load(context),
		).rejects.toThrow("ID column");
	});

	it("should reject duplicate idColumn values", async () => {
		stubFetch(gvizResponse(cols, [...rows, { c: [{ v: "Ada" }, { v: 99 }] }]));
		const { context } = mockContext();
		await expect(
			sheetLoader({ document: "test", idColumn: "Name" }).load(context),
		).rejects.toThrow("duplicate");
	});

	it("should reject blank idColumn values", async () => {
		stubFetch(gvizResponse(cols, [{ c: [{ v: null }, { v: 1 }] }]));
		const { context } = mockContext();
		await expect(
			sheetLoader({ document: "test", idColumn: "Name" }).load(context),
		).rejects.toThrow("no value");
	});

	it("should remove entries whose rows were deleted from the sheet", async () => {
		stubFetch(gvizResponse(cols, rows), gvizResponse(cols, rows.slice(0, 2)));
		const { context, entries } = mockContext();
		const loader = sheetLoader({ document: "test" });
		await loader.load(context);
		expect(entries.size).toBe(3);
		await loader.load(context);
		expect([...entries.keys()]).toEqual(["row_0", "row_1"]);
	});

	it("should clear the store when the sheet returns no rows", async () => {
		stubFetch(gvizResponse(cols, rows), gvizResponse(cols, []));
		const { context, entries } = mockContext();
		const loader = sheetLoader({ document: "test" });
		await loader.load(context);
		await loader.load(context);
		expect(entries.size).toBe(0);
	});

	it("should fetch fresh data on every load", async () => {
		const mock = stubFetch(gvizResponse(cols, rows), gvizResponse(cols, rows));
		const { context } = mockContext();
		const loader = sheetLoader({ document: "test" });
		await loader.load(context);
		await loader.load(context);
		expect(mock).toHaveBeenCalledTimes(2);
	});

	it("should encode the sheet and range parameters", async () => {
		const mock = stubFetch(gvizResponse(cols, rows));
		const { context } = mockContext();
		await sheetLoader({
			document: "test",
			sheet: "A&B",
			range: "B2:F10",
		}).load(context);
		const url = String(mock.mock.calls[0]?.[0]);
		expect(url).toContain("sheet=A%26B");
		expect(url).toContain("range=B2%3AF10");
	});

	it("should generate a schema and types with createSchema", async () => {
		stubFetch(gvizResponse(cols, rows));
		const loader = sheetLoader({ document: "test" }) as SchemaLoader;
		const result = await loader.createSchema();
		expect(result.schema).toBeTruthy();
		expect(result.types).toContain("export type Entry");
		expect(result.types).toContain('"Name": string;');
		expect(result.types).toContain('"Age": number;');
	});
});

describe("sheetLiveLoader", () => {
	it("should load all entries", async () => {
		stubFetch(gvizResponse(cols, rows));
		const result = await sheetLiveLoader({ document: "test" }).loadCollection({
			collection: "test",
		});
		if (!("entries" in result)) throw new Error("expected entries");
		expect(result.entries).toHaveLength(3);
		expect(result.entries[0]).toEqual({
			id: "row_0",
			data: { Name: "Ada", Age: 36 },
		});
	});

	it("should load a single entry by ID", async () => {
		stubFetch(gvizResponse(cols, rows));
		const result = await sheetLiveLoader({
			document: "test",
			idColumn: "Name",
		}).loadEntry({ collection: "test", filter: { id: "Grace" } });
		if (!result || !("data" in result)) throw new Error("expected an entry");
		expect(result.data).toEqual({ Name: "Grace", Age: 45 });
	});

	it("should return undefined for a missing entry", async () => {
		stubFetch(gvizResponse(cols, rows));
		const result = await sheetLiveLoader({ document: "test" }).loadEntry({
			collection: "test",
			filter: { id: "row_99" },
		});
		expect(result).toBeUndefined();
	});

	it("should return an error instead of throwing", async () => {
		stubFetch("<!DOCTYPE html><html></html>");
		const result = await sheetLiveLoader({ document: "bad" }).loadCollection({
			collection: "test",
		});
		if (!("error" in result)) throw new Error("expected an error");
		expect(result.error).toBeInstanceOf(Error);
	});
});
