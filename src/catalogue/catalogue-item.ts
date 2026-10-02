import { z } from "zod";
import { deletedAtSchema, type ItemId } from "../core/index.ts";
import { categoryIdSchema } from "./category.ts";
import { necessitySchema } from "./necessity.ts";
import { shopIdSchema } from "./shop.ts";
import { tagIdSchema } from "./tag.ts";

export const CATALOGUE_ITEMS_COLLECTION = "catalogueItems";

/** The doc path for one CatalogueItem, ready for `doc(db, ...)`. */
export function catalogueItemDocPath(itemId: ItemId): string {
  return `${CATALOGUE_ITEMS_COLLECTION}/${itemId}`;
}

/**
 * Keyed by the Core Item's {@link ItemId}. `shopId`, when set, overrides the Category's default.
 */
export const catalogueItemSchema = z.looseObject({
  categoryId: categoryIdSchema,
  necessity: necessitySchema,
  shopId: shopIdSchema.optional(),
  /** The Tags on this CatalogueItem, soft-deleted ones included; empty when it has none. */
  tagIds: z.array(tagIdSchema).default([]),
  deletedAt: deletedAtSchema,
});

export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
