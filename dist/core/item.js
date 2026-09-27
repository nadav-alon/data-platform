import { z } from "zod";
import { stateSchema } from "./state.js";
export const ITEMS_COLLECTION = "items";
export function isItemId(value) {
    return value.length > 0;
}
export function itemId(value) {
    if (!isItemId(value)) {
        throw new Error(`ItemId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const itemIdSchema = z.string().refine(isItemId, "ItemId must not be empty");
export const itemSchema = z.looseObject({
    name: z.string().min(1),
    brandNote: z.string().optional(),
    barcodes: z.array(z.string().min(1)).optional(),
    state: stateSchema,
});
