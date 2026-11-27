import * as core from "./core/index.js";
import * as catalogue from "./catalogue/index.js";
import * as recipes from "./recipes/index.js";
import * as nutrition from "./nutrition/index.js";
export { core, catalogue, recipes, nutrition };
/**
 * Every collection in the platform — Core, Catalogue, Recipes and Nutrition alike — schemas keyed by collection name
 * (or, for a collection like `meta` whose schema depends on the doc id, its full doc path).
 */
export const COLLECTION_SCHEMAS = {
    ...core.CORE_COLLECTION_SCHEMAS,
    ...catalogue.CATALOGUE_COLLECTION_SCHEMAS,
    ...recipes.RECIPES_COLLECTION_SCHEMAS,
    ...nutrition.NUTRITION_COLLECTION_SCHEMAS,
};
