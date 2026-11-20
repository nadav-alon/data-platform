import type { CollectionSchemas } from "../core/index.ts";
import { RECIPES_COLLECTION, recipeSchema } from "./recipe.ts";

/** Every Recipes collection's zod schema, keyed by its collection name. */
export const RECIPES_COLLECTION_SCHEMAS: CollectionSchemas = {
  [RECIPES_COLLECTION]: recipeSchema,
};
