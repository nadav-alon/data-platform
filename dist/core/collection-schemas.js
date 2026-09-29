import { HOUSEHOLD_DOC_PATH, householdMetaSchema } from "./household.js";
import { ITEMS_COLLECTION, itemSchema } from "./item.js";
import { MEMBERS_COLLECTION, memberSchema } from "./members.js";
import { PLATFORM_DOC_PATH, platformMetaSchema } from "./platform.js";
import { STATE_HISTORY_COLLECTION, stateHistoryEntrySchema } from "./state-history.js";
/**
 * Every Core collection's zod schema, keyed by its collection name. Two exceptions: `meta`'s
 * `household` and `platform` are singleton docs with unrelated shapes, not many docs sharing one
 * schema, so they're keyed by their full doc path (`HOUSEHOLD_DOC_PATH`, `PLATFORM_DOC_PATH`)
 * instead; `stateHistory` is nested under a variable Item id, so it's keyed by its parent's
 * collection name with the id wildcarded (`${ITEMS_COLLECTION}/*\/${STATE_HISTORY_COLLECTION}`).
 */
export const CORE_COLLECTION_SCHEMAS = {
    [HOUSEHOLD_DOC_PATH]: householdMetaSchema,
    [PLATFORM_DOC_PATH]: platformMetaSchema,
    [ITEMS_COLLECTION]: itemSchema,
    [MEMBERS_COLLECTION]: memberSchema,
    [`${ITEMS_COLLECTION}/*/${STATE_HISTORY_COLLECTION}`]: stateHistoryEntrySchema,
};
