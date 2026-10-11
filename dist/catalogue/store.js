import { z } from "zod";
import { deletedAtSchema } from "../core/index.js";
import { aisleIdSchema } from "./aisle.js";
import { normalizeName } from "./name-key.js";
import { shopIdSchema } from "./shop.js";
export const STORES_COLLECTION = "stores";
export function isStoreId(value) {
    return value.length > 0;
}
export function storeId(value) {
    if (!isStoreId(value)) {
        throw new Error(`StoreId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const storeIdSchema = z.string().refine(isStoreId, "StoreId must not be empty");
/**
 * A named Store under one Shop ("Osher Ad" under "grocery"). Branches aren't modelled: a second
 * differing branch is another Store with a longer name. Nothing references a Store, so it holds
 * no reference count and doesn't count toward its Shop's.
 */
export const storeSchema = z.looseObject({
    name: z.string().refine((name) => normalizeName(name).length > 0, "Store name must not be blank"),
    shopId: shopIdSchema,
    /**
     * This Store's Aisles in the order one walks them, soft-deleted ones included; empty when no
     * order is set. An Aisle appears at most once.
     */
    aisleOrder: z
        .array(aisleIdSchema)
        .refine((ids) => new Set(ids).size === ids.length, "aisleOrder must not repeat an Aisle")
        .default([]),
    deletedAt: deletedAtSchema,
});
