import type { CollectionSchemas } from "../core/index.ts";
import { NUTRITION_TARGETS_COLLECTION, targetsSchema } from "./targets.ts";
import { FOODS_COLLECTION, foodSchema } from "./food.ts";

/** Every Nutrition collection's zod schema, keyed by its collection name. */
export const NUTRITION_COLLECTION_SCHEMAS: CollectionSchemas = {
  [NUTRITION_TARGETS_COLLECTION]: targetsSchema,
  [FOODS_COLLECTION]: foodSchema,
};
