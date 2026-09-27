import type { ZodType } from "zod";
import * as core from "./core/index.ts";
import * as catalogue from "./catalogue/index.ts";

export { core, catalogue };

/** Every collection in the platform — Core and Catalogue alike — keyed by its own schema. */
export const COLLECTION_SCHEMAS: Record<string, ZodType> = {
  ...core.CORE_COLLECTION_SCHEMAS,
  ...catalogue.CATALOGUE_COLLECTION_SCHEMAS,
};
