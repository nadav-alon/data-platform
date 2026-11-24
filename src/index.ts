import type { CollectionSchemas } from "./core/index.ts";
import * as core from "./core/index.ts";
import * as catalogue from "./catalogue/index.ts";
import * as recipes from "./recipes/index.ts";
import * as nutrition from "./nutrition/index.ts";

export { core, catalogue, recipes, nutrition };
export type { CollectionSchemas };

/**
 * Every collection in the platform — Core, Catalogue, Recipes and Nutrition alike — schemas keyed by collection name
 * (or, for a collection like `meta` whose schema depends on the doc id, its full doc path).
 */
export const COLLECTION_SCHEMAS: CollectionSchemas = {
  ...core.CORE_COLLECTION_SCHEMAS,
  ...catalogue.CATALOGUE_COLLECTION_SCHEMAS,
  ...recipes.RECIPES_COLLECTION_SCHEMAS,
  ...nutrition.NUTRITION_COLLECTION_SCHEMAS,
};
