import { HOUSEHOLD_SETTINGS_DOC_PATH, householdSettingsSchema } from "./household-settings.js";
import { RECIPES_COLLECTION, recipeSchema } from "./recipe.js";
/**
 * Every Recipes collection's zod schema, keyed by its collection name; the settings singleton is
 * keyed by its full doc path, as `meta/household` is.
 */
export const RECIPES_COLLECTION_SCHEMAS = {
    [RECIPES_COLLECTION]: recipeSchema,
    [HOUSEHOLD_SETTINGS_DOC_PATH]: householdSettingsSchema,
};
