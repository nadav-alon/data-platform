import { NUTRITION_TARGETS_COLLECTION, targetsSchema } from "./targets.js";
import { FOODS_COLLECTION, foodSchema } from "./food.js";
import { LOG_ENTRIES_COLLECTION, NUTRITION_LOGS_COLLECTION, logEntrySchema } from "./log-entry.js";
/**
 * Every Nutrition collection's zod schema, keyed by its collection name; Log Entries are nested
 * under a Member's uid, so they are keyed by the parent with the id wildcarded.
 */
export const NUTRITION_COLLECTION_SCHEMAS = {
    [NUTRITION_TARGETS_COLLECTION]: targetsSchema,
    [FOODS_COLLECTION]: foodSchema,
    [`${NUTRITION_LOGS_COLLECTION}/*/${LOG_ENTRIES_COLLECTION}`]: logEntrySchema,
};
