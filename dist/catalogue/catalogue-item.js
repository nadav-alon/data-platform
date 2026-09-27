import { z } from "zod";
import { categoryIdSchema } from "./category.js";
import { necessitySchema } from "./necessity.js";
import { shopIdSchema } from "./shop.js";
export const CATALOGUE_ITEMS_COLLECTION = "catalogueItems";
/**
 * Keyed by Core Item id. `shopId`, when set, overrides the Category's default.
 */
export const catalogueItemSchema = z.looseObject({
    categoryId: categoryIdSchema,
    necessity: necessitySchema,
    shopId: shopIdSchema.optional(),
});
