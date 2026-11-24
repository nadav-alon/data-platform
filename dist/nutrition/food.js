import { z } from "zod";
import { deletedAtSchema } from "../core/index.js";
import { nutritionSchema } from "./nutrition.js";
export const FOODS_COLLECTION = "foods";
export function isFoodId(value) {
    return value.length > 0;
}
export function foodId(value) {
    if (!isFoodId(value)) {
        throw new Error(`FoodId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const foodIdSchema = z.string().refine(isFoodId, "FoodId must not be empty");
/**
 * A dish or product the Household has saved that is not a Recipe, shared by the Household.
 * `perServing` is the Nutrition of one serving, which `servingLabel` describes ("1 plate"); `place`
 * is where it is eaten or bought. `estimated` says the numbers are an estimate, not a label or
 * source; absent means they are not.
 */
export const foodSchema = z.looseObject({
    name: z.string().min(1),
    place: z.string().optional(),
    perServing: nutritionSchema,
    servingLabel: z.string().optional(),
    estimated: z.literal(true).optional(),
    deletedAt: deletedAtSchema,
});
