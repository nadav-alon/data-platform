import type { ZodType } from "zod";
import { CATALOGUE_ITEMS_COLLECTION, catalogueItemSchema } from "./catalogue-item.ts";
import { CATEGORIES_COLLECTION, categorySchema } from "./category.ts";
import { SHOPS_COLLECTION, shopSchema } from "./shop.ts";

/** Every Catalogue collection's zod schema, keyed by its collection name. */
export const CATALOGUE_COLLECTION_SCHEMAS: Record<string, ZodType> = {
  [CATALOGUE_ITEMS_COLLECTION]: catalogueItemSchema,
  [CATEGORIES_COLLECTION]: categorySchema,
  [SHOPS_COLLECTION]: shopSchema,
};
