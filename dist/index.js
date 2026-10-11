import * as core from "./core/index.js";
import * as catalogue from "./catalogue/index.js";
export { core, catalogue };
/**
 * Every collection in the platform — Core and Catalogue alike — schemas keyed by collection name
 * (or, for a collection like `meta` whose schema depends on the doc id, its full doc path).
 */
export const COLLECTION_SCHEMAS = {
    ...core.CORE_COLLECTION_SCHEMAS,
    ...catalogue.CATALOGUE_COLLECTION_SCHEMAS,
};
