import { z } from "zod";
import { categoryIdSchema } from "./category.ts";
import { necessitySchema } from "./necessity.ts";
import { shopIdSchema } from "./shop.ts";

export const CATALOGUE_ITEMS_COLLECTION = "catalogueItems";

/**
 * Keyed by Core Item id. `shopId`, when set, overrides the Category's default.
 */
export const catalogueItemSchema = z.looseObject({
  categoryId: categoryIdSchema,
  necessity: necessitySchema,
  shopId: shopIdSchema.optional(),
});

export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
