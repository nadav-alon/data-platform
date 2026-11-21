import { RECIPES_COLLECTION, recipeSchema } from "./recipe.js";
/** Every Recipes collection's zod schema, keyed by its collection name. */
export const RECIPES_COLLECTION_SCHEMAS = {
    [RECIPES_COLLECTION]: recipeSchema,
};
