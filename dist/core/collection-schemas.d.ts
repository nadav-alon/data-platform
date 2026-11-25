import type { ZodType } from "zod";
/**
 * A map from a collection's zod schema to the key a doc resolves it by: usually the collection's
 * own name, but a full doc path (`meta/household`) for a collection whose schema depends on the
 * doc id, or a parent collection name with the id wildcarded (`items/*\/stateHistory`) for one
 * doc nested under a variable parent id.
 */
export type CollectionSchemas = Record<string, ZodType>;
/**
 * Every Core collection's zod schema, keyed by its collection name. Two exceptions: `meta`'s
 * `household` and `platform` are singleton docs with unrelated shapes, not many docs sharing one
 * schema, so they're keyed by their full doc path (`HOUSEHOLD_DOC_PATH`, `PLATFORM_DOC_PATH`)
 * instead; `stateHistory` is nested under a variable Item id, so it's keyed by its parent's
 * collection name with the id wildcarded (`${ITEMS_COLLECTION}/*\/${STATE_HISTORY_COLLECTION}`).
 */
export declare const CORE_COLLECTION_SCHEMAS: CollectionSchemas;
