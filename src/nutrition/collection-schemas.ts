import type { CollectionSchemas } from "../core/index.ts";
import { NUTRITION_TARGETS_COLLECTION, targetsSchema } from "./targets.ts";
import { NUTRITION_SETTINGS_COLLECTION, nutritionSettingsSchema } from "./settings.ts";
import { FOODS_COLLECTION, foodSchema } from "./food.ts";
import { LOG_ENTRIES_COLLECTION, NUTRITION_LOGS_COLLECTION, logEntrySchema } from "./log-entry.ts";

/**
 * Every Nutrition collection's zod schema, keyed by its collection name; Log Entries are nested
 * under a Member's uid, so they are keyed by the parent with the id wildcarded.
 */
export const NUTRITION_COLLECTION_SCHEMAS: CollectionSchemas = {
  [NUTRITION_TARGETS_COLLECTION]: targetsSchema,
  [NUTRITION_SETTINGS_COLLECTION]: nutritionSettingsSchema,
  [FOODS_COLLECTION]: foodSchema,
  [`${NUTRITION_LOGS_COLLECTION}/*/${LOG_ENTRIES_COLLECTION}`]: logEntrySchema,
};
