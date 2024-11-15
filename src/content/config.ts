import { defineCollection, z } from "astro:content";
import { sheetLoader, camelCase, snake_case } from "../../loader/index.ts";

const crm = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    allowBlanks: true,
    transformHeader: camelCase,
  }),
});

// testing query
const toContact = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    query: "select B, C, D, E where H != true",
    allowBlanks: true,
  }),
});

// testing sheet name
const sheetName = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    sheet: "Sheet with long name",
    allowBlanks: true,
  }),
});

// testing gid and range
const shiftedHours = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    gid: 1598048008,
    range: "B2:F10",
    allowBlanks: true,
    transformHeader: snake_case,
  }),
});

// will fail tue to non-public document id
const badDocument = defineCollection({
  loader: sheetLoader({
    document: "MY PRIVATE DOCUMENT ID",
  }),
});

// will fail due to invalid query
const badQuery = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    query: "order by non_existing_column_name limit 10",
  }),
});

// will fail due to bad range
const badRange = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    range: "AA2222222:ZZ9999999",
  }),
});

// will fail due to blank column names in the JSON response (even if they are not blank in the sheet)
// honestly I don't know why
const badColumns = defineCollection({
  loader: sheetLoader({
    document: "1h-oqlqJ_G3UXuDSkdFHuEaCVuOXQOb68y2sduXQRTn4",
    allowBlanks: true,
  }),
});

// will fail due to missing data
const badMandatory = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    sheet: "InvalidNumbers",
    allowBlanks: false,
  }),
});

// will fail due to data validation
const badData = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    sheet: "InvalidNumbers",
  }),
  schema: z.object({
    "Credit Card Type": z.enum(["Visa", "MasterCard", "American Express"]),
    "Credit Card Number": z.number().int().optional(),
  }),
});

// test user-defined schema
const badResponse = defineCollection({
  loader: sheetLoader({
    document: "1wb2TbwRE-McOA663PGgf0InTsXC6b07ThEy_j6_MCDw",
    sheet: "logs",
    range: "A:B99",
  }),
  schema: z.object({
    customer_id: z.string(),
    email: z.string().email(),
    last_ip_address: z.string().ip(),
    last_login_timestamp: z.string().datetime().optional(),
  }),
});

// can be used in pages/index.astro
export const collections = {
  crm,
  toContact,
  sheetName,
  shiftedHours,
  // beware of errors:
  //badDocument,
  //badQuery,
  //badRange,
  //badColumns,
  //badMandatory,
  //badData,
  //badResponse
};
