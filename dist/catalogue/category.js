import { z } from "zod";
import { deletedAtSchema } from "../core/index.js";
import { referenceCountSchema } from "./reference-count.js";
import { shopIdSchema } from "./shop.js";
export const CATEGORIES_COLLECTION = "categories";
export function isCategoryId(value) {
    return value.length > 0;
}
export function categoryId(value) {
    if (!isCategoryId(value)) {
        throw new Error(`CategoryId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const categoryIdSchema = z.string().refine(isCategoryId, "CategoryId must not be empty");
export const categorySchema = z.looseObject({
    name: z.string().min(1),
    defaultShopId: shopIdSchema,
    /** CatalogueItems whose `categoryId` points at this Category. */
    referenceCount: referenceCountSchema,
    deletedAt: deletedAtSchema,
});
