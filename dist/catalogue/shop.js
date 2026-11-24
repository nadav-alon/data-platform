import { z } from "zod";
import { deletedAtSchema } from "../core/index.js";
import { referenceCountSchema } from "./reference-count.js";
export const SHOPS_COLLECTION = "shops";
export function isShopId(value) {
    return value.length > 0;
}
export function shopId(value) {
    if (!isShopId(value)) {
        throw new Error(`ShopId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const shopIdSchema = z.string().refine(isShopId, "ShopId must not be empty");
/**
 * A kind of place (pharmacy, grocery), not a specific store.
 */
export const shopSchema = z.looseObject({
    name: z.string().min(1),
    /** Categories whose `defaultShopId` and CatalogueItems whose `shopId` point at this Shop. */
    referenceCount: referenceCountSchema,
    deletedAt: deletedAtSchema,
});
