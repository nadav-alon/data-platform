import type { CollectionSchemas } from "./core/index.ts";
import * as core from "./core/index.ts";
import * as catalogue from "./catalogue/index.ts";
export { core, catalogue };
export type { CollectionSchemas };
/**
 * Every collection in the platform — Core and Catalogue alike — schemas keyed by collection name
 * (or, for a collection like `meta` whose schema depends on the doc id, its full doc path).
 */
export declare const COLLECTION_SCHEMAS: CollectionSchemas;
