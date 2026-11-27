import type { CollectionSchemas } from "../core/index.ts";
/**
 * Every Nutrition collection's zod schema, keyed by its collection name; Log Entries are nested
 * under a Member's uid, so they are keyed by the parent with the id wildcarded.
 */
export declare const NUTRITION_COLLECTION_SCHEMAS: CollectionSchemas;
