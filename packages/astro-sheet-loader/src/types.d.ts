// ################################################################ Imports

import type { LoaderContext } from "astro/loaders";

// ################################################################ Types

// ################################ General

export type transformHeaderType = false | ((text: string | number) => string);

// ################################ JSON

export interface Cell {
	f?: string;
	v: string | number | null;
}

export interface Row {
	c: (Cell | null)[];
}

export interface Column {
	id: string;
	label: string;
	type: string;
	pattern?: string;
}

export interface TableData {
	cols: Column[];
	rows: Row[];
}

export interface ErrorData {
	reason: string;
	message: string;
	detailed_message: string;
}

// table may not be present if status == "error", so we account for it
export interface JSONData {
	version: string;
	reqId: string;
	status: string;
	errors?: ErrorData[];
	sig: string;
	table: TableData;
}

// ################################ Schema

export interface sheetSchemaToZodSchemaOptions {
	/** List of columns from Sheet API */
	cols: Column[];
	/** Apply a tranformation function to the header row */
	transformHeader?: transformHeaderType;
	/** If columns may have null values */
	allowBlanks?: boolean;
}

// ################################ Loader

export interface ProcessHeaderOptions {
	cols: Column[];
	transformHeader: transformHeaderType;
	collection: LoaderContext["collection"];
	logger: LoaderContext["logger"];
}

export interface ProcessContentOptions {
	rows: Row[];
	columns: string[];
	collection: LoaderContext["collection"];
	logger: LoaderContext["logger"];
	store: LoaderContext["store"];
	generateDigest: LoaderContext["generateDigest"];
	parseData: LoaderContext["parseData"];
}

// ################################ Main

/**
 * Options for the Sheet loader
 */
export interface SheetLoaderOptions {
	/** The document ID */
	document: string;
	/** The sheet ID */
	gid?: number;
	/** The sheet name */
	sheet?: string;
	/** The range of cells to load */
	range?: string;
	/** Query to apply */
	query?: string;
	/** Apply a tranformation function to the header row, like 'camelCase' or 'snake_case' */
	transformHeader?: transformHeaderType;
	/** Don't fail validation if some entries miss some values */
	allowBlanks?: boolean;
}
