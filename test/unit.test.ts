import { describe, it, expect } from "vitest";
import { z } from "astro/zod";
import {
  sheetToJSON,
  sheetSchemaToZodSchema,
  camelCase,
  snake_case,
} from "../loader/sheet-loader.js";

const document1 = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

const documentUrl1 = `https://docs.google.com/spreadsheets/d/${document1}/gviz/tq?tqx=out:json`;

const expected_json1 = JSON.parse(
  `{"version":"0.6","reqId":"0","status":"ok","sig":"1418075960","table":{"cols":[{"id":"A","label":"","type":"string"},{"id":"B","label":"","type":"string"},{"id":"C","label":"","type":"string"},{"id":"D","label":"","type":"string"},{"id":"E","label":"","type":"string"},{"id":"F","label":"","type":"string"},{"id":"G","label":"","type":"string"},{"id":"H","label":"","type":"string"},{"id":"I","label":"","type":"string"},{"id":"J","label":"","type":"string"},{"id":"K","label":"","type":"string"},{"id":"L","label":"","type":"string"},{"id":"M","label":"","type":"string"},{"id":"N","label":"","type":"string"},{"id":"O","label":"","type":"string"},{"id":"P","label":"","type":"string"},{"id":"Q","label":"","type":"string"},{"id":"R","label":"","type":"string"},{"id":"S","label":"","type":"string"},{"id":"T","label":"","type":"string"},{"id":"U","label":"","type":"string"},{"id":"V","label":"","type":"string"}],"rows":[{"c":[{"v":"Student Name"},{"v":"Gender"},{"v":"Class Level"},{"v":"Home State"},{"v":"Major"},{"v":"Extracurricular Activity"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Alexandra"},{"v":"Female"},{"v":"4. Senior"},{"v":"CA"},{"v":"English"},{"v":"Drama Club"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Andrew"},{"v":"Male"},{"v":"1. Freshman"},{"v":"SD"},{"v":"Math"},{"v":"Lacrosse"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Anna"},{"v":"Female"},{"v":"1. Freshman"},{"v":"NC"},{"v":"English"},{"v":"Basketball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Becky"},{"v":"Female"},{"v":"2. Sophomore"},{"v":"SD"},{"v":"Art"},{"v":"Baseball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Benjamin"},{"v":"Male"},{"v":"4. Senior"},{"v":"WI"},{"v":"English"},{"v":"Basketball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Carl"},{"v":"Male"},{"v":"3. Junior"},{"v":"MD"},{"v":"Art"},{"v":"Debate"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Carrie"},{"v":"Female"},{"v":"3. Junior"},{"v":"NE"},{"v":"English"},{"v":"Track & Field"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Dorothy"},{"v":"Female"},{"v":"4. Senior"},{"v":"MD"},{"v":"Math"},{"v":"Lacrosse"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Dylan"},{"v":"Male"},{"v":"1. Freshman"},{"v":"MA"},{"v":"Math"},{"v":"Baseball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Edward"},{"v":"Male"},{"v":"3. Junior"},{"v":"FL"},{"v":"English"},{"v":"Drama Club"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Ellen"},{"v":"Female"},{"v":"1. Freshman"},{"v":"WI"},{"v":"Physics"},{"v":"Drama Club"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Fiona"},{"v":"Female"},{"v":"1. Freshman"},{"v":"MA"},{"v":"Art"},{"v":"Debate"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"John"},{"v":"Male"},{"v":"3. Junior"},{"v":"CA"},{"v":"Physics"},{"v":"Basketball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Jonathan"},{"v":"Male"},{"v":"2. Sophomore"},{"v":"SC"},{"v":"Math"},{"v":"Debate"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Joseph"},{"v":"Male"},{"v":"1. Freshman"},{"v":"AK"},{"v":"English"},{"v":"Drama Club"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Josephine"},{"v":"Female"},{"v":"1. Freshman"},{"v":"NY"},{"v":"Math"},{"v":"Debate"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Karen"},{"v":"Female"},{"v":"2. Sophomore"},{"v":"NH"},{"v":"English"},{"v":"Basketball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Kevin"},{"v":"Male"},{"v":"2. Sophomore"},{"v":"NE"},{"v":"Physics"},{"v":"Drama Club"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Lisa"},{"v":"Female"},{"v":"3. Junior"},{"v":"SC"},{"v":"Art"},{"v":"Lacrosse"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Mary"},{"v":"Female"},{"v":"2. Sophomore"},{"v":"AK"},{"v":"Physics"},{"v":"Track & Field"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Maureen"},{"v":"Female"},{"v":"1. Freshman"},{"v":"CA"},{"v":"Physics"},{"v":"Basketball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Nick"},{"v":"Male"},{"v":"4. Senior"},{"v":"NY"},{"v":"Art"},{"v":"Baseball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Olivia"},{"v":"Female"},{"v":"4. Senior"},{"v":"NC"},{"v":"Physics"},{"v":"Track & Field"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Pamela"},{"v":"Female"},{"v":"3. Junior"},{"v":"RI"},{"v":"Math"},{"v":"Baseball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Patrick"},{"v":"Male"},{"v":"1. Freshman"},{"v":"NY"},{"v":"Art"},{"v":"Lacrosse"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Robert"},{"v":"Male"},{"v":"1. Freshman"},{"v":"CA"},{"v":"English"},{"v":"Track & Field"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Sean"},{"v":"Male"},{"v":"1. Freshman"},{"v":"NH"},{"v":"Physics"},{"v":"Track & Field"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Stacy"},{"v":"Female"},{"v":"1. Freshman"},{"v":"NY"},{"v":"Math"},{"v":"Baseball"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Thomas"},{"v":"Male"},{"v":"2. Sophomore"},{"v":"RI"},{"v":"Art"},{"v":"Lacrosse"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]},{"c":[{"v":"Will"},{"v":"Male"},{"v":"4. Senior"},{"v":"FL"},{"v":"Math"},{"v":"Debate"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,{"v":null}]}],"parsedNumHeaders":0}}`,
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
  it("should generate a zod schema with optional values", async () => {
    const generatedSchema = await sheetSchemaToZodSchema({ cols: jsonCols1 });
    expect(generatedSchema.isOptional()).toEqual(zodCols1Base.isOptional());
    expect(generatedSchema.shape["Last Hug Received"]).toBeTruthy();
  });

  it("should generate a zod schema with mandatory values", async () => {
    const generatedSchema = await sheetSchemaToZodSchema({
      cols: jsonCols1,
      allowBlanks: false,
    });
    expect(generatedSchema.shape.Birthday.isOptional()).toEqual(
      zodCols1Strict.shape.Birthday.isOptional(),
    );
    expect(generatedSchema.shape.Birthday.isOptional()).toEqual(false);
    expect(generatedSchema.shape["Age"].isOptional()).toBeFalsy();
  });

  it("should generate a zod schema with camel case entries", async () => {
    const generatedSchema = await sheetSchemaToZodSchema({
      cols: jsonCols1,
      allowBlanks: false,
      transformHeader: camelCase,
    });
    expect(generatedSchema.shape.lastHugReceived).toBeTruthy();
    expect(generatedSchema.shape["lastHugReceived"]).toBeTruthy();
    expect(generatedSchema.shape["Last Hug Received"]).toBeFalsy();
  });
});

describe("Fetch (Online)", () => {
  it("should fetch the expected json file", async () => {
    const fetched_json = await sheetToJSON({ url: documentUrl1 });
    expect(fetched_json).toEqual(expected_json1);
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
