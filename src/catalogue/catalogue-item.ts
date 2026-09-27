import { z } from "zod";
import { categoryIdSchema } from "./category.ts";
import { necessitySchema } from "./necessity.ts";
import { shopIdSchema } from "./shop.ts";
import type { ItemId } from "../core/index.ts";

export const CATALOGUE_ITEMS_COLLECTION = "catalogueItems";

/** The doc path for one CatalogueItem, ready for `doc(db, ...)`. */
export function catalogueItemDocPath(itemId: ItemId): string {
  return `${CATALOGUE_ITEMS_COLLECTION}/${itemId}`;
}

/**
 * Keyed by Core Item id. `shopId`, when set, overrides the Category's default.
 */
export const catalogueItemSchema = z.looseObject({
  categoryId: categoryIdSchema,
  necessity: necessitySchema,
  shopId: shopIdSchema.optional(),
});

export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
