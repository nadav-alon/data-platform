import { NUTRITION_TARGETS_COLLECTION, targetsSchema } from "./targets.js";
import { FOODS_COLLECTION, foodSchema } from "./food.js";
/** Every Nutrition collection's zod schema, keyed by its collection name. */
export const NUTRITION_COLLECTION_SCHEMAS = {
    [NUTRITION_TARGETS_COLLECTION]: targetsSchema,
    [FOODS_COLLECTION]: foodSchema,
};
