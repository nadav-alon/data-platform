import type { ZodType } from "zod";
import { HOUSEHOLD_DOC_PATH, householdMetaSchema } from "./household.ts";
import { ITEMS_COLLECTION, itemSchema } from "./item.ts";
import { MEMBERS_COLLECTION, memberSchema } from "./members.ts";
import { PLATFORM_DOC_PATH, platformMetaSchema } from "./platform.ts";
import { STATE_HISTORY_COLLECTION, stateHistoryEntrySchema } from "./state-history.ts";

/**
 * Every Core collection's zod schema, keyed by its collection name. `meta` is the one exception:
 * `household` and `platform` are two singleton docs with unrelated shapes, not many docs sharing
 * one schema, so they're keyed by their full doc path (`HOUSEHOLD_DOC_PATH`, `PLATFORM_DOC_PATH`)
 * instead.
 */
export const CORE_COLLECTION_SCHEMAS: Record<string, ZodType> = {
  [HOUSEHOLD_DOC_PATH]: householdMetaSchema,
  [PLATFORM_DOC_PATH]: platformMetaSchema,
  [ITEMS_COLLECTION]: itemSchema,
  [MEMBERS_COLLECTION]: memberSchema,
  [STATE_HISTORY_COLLECTION]: stateHistoryEntrySchema,
};
