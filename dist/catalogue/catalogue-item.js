import { z } from "zod";
import { deletedAtSchema } from "../core/index.js";
import { categoryIdSchema } from "./category.js";
import { necessitySchema } from "./necessity.js";
import { shopIdSchema } from "./shop.js";
export const CATALOGUE_ITEMS_COLLECTION = "catalogueItems";
/** The doc path for one CatalogueItem, ready for `doc(db, ...)`. */
export function catalogueItemDocPath(itemId) {
    return `${CATALOGUE_ITEMS_COLLECTION}/${itemId}`;
}
/**
 * Keyed by the Core Item's {@link ItemId}. `shopId`, when set, overrides the Category's default.
 */
export const catalogueItemSchema = z.looseObject({
    categoryId: categoryIdSchema,
    necessity: necessitySchema,
    shopId: shopIdSchema.optional(),
    deletedAt: deletedAtSchema,
});
