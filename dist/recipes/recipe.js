import { z } from "zod";
import { deletedAtSchema, itemIdSchema } from "../core/index.js";
export const RECIPES_COLLECTION = "recipes";
export function isRecipeId(value) {
    return value.length > 0;
}
export function recipeId(value) {
    if (!isRecipeId(value)) {
        throw new Error(`RecipeId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const recipeIdSchema = z.string().refine(isRecipeId, "RecipeId must not be empty");
/** The units an Ingredient's `quantity` can be measured in. */
export const INGREDIENT_UNITS = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece"];
/**
 * One line of a Recipe. `itemId` links it to a Core Item; `assumed` marks a staple taken as
 * already in the house, so it never names an Item. A `unit` only means something beside a
 * `quantity`. Bought: see `Recipe.boughtIngredients`.
 */
export const ingredientSchema = z
    .looseObject({
    name: z.string().min(1),
    itemId: itemIdSchema.optional(),
    assumed: z.literal(true).optional(),
    quantity: z.number().positive().optional(),
    unit: z.enum(INGREDIENT_UNITS).optional(),
    prepNote: z.string().optional(),
})
    .refine((ingredient) => !(ingredient.assumed === true && ingredient.itemId !== undefined), {
    message: "An assumed Ingredient must not name an Item",
})
    .refine((ingredient) => ingredient.unit === undefined || ingredient.quantity !== undefined, {
    message: "An Ingredient's unit needs a quantity",
});
/**
 * One document with everything embedded. `wanted` says the Household wants to make it; absent
 * means not wanted. `boughtIngredients` holds the name of each Ingredient marked bought, keyed by
 * name so a reorder of `ingredients` cannot move the mark to another Ingredient and one field can
 * be written without reading the Recipe; absent or empty means none is bought. Only a Wanted Recipe
 * has any. A name matching no unlinked Ingredient is tolerated on read, since an offline tick or another app's edit can
 * store one and it must not make the Recipe unreadable; `setIngredientLink` prunes it. Never versioned and never hard-deleted, so its id stays stable
 * for anything that points at it. `recipeObjectSchema` is its shape without the cross-field checks,
 * for deriving a schema with `.omit` or `.shape`, which a refined schema does not allow.
 */
/** The Recipe field holding every Bought, keyed by Ingredient name. */
export const BOUGHT_FIELD = "boughtIngredients";
/** Whether an Ingredient names neither an Item nor Assumed: the only kind that can be bought. */
export function isUnlinked(ingredient) {
    return ingredient.itemId === undefined && ingredient.assumed !== true;
}
export const recipeObjectSchema = z.looseObject({
    title: z.string().min(1),
    ingredients: z.array(ingredientSchema),
    prepSteps: z.array(z.string().min(1)),
    steps: z.array(z.string().min(1)),
    servings: z.number().int().positive().optional(),
    sourceUrl: z.string().optional(),
    notes: z.string().optional(),
    wanted: z.literal(true).optional(),
    [BOUGHT_FIELD]: z.record(z.string().min(1), z.literal(true)).optional(),
    deletedAt: deletedAtSchema,
});
export const recipeSchema = recipeObjectSchema.superRefine((recipe, context) => {
    if (Object.keys(recipe.boughtIngredients ?? {}).length > 0 && recipe.wanted !== true) {
        context.addIssue({ code: "custom", message: "Nothing is bought on a Recipe that is not Wanted" });
    }
});
/** A Recipe snapshot's data when it is live; throws an `Error` for an unknown or soft-deleted Recipe. */
export function liveRecipeData(snapshot, id) {
    const data = snapshot.data();
    if (data === undefined || data.deletedAt !== undefined) {
        throw new Error(`No live Recipe ${JSON.stringify(id)}`);
    }
    return data;
}
/** The Recipe's Ingredient at `position`; throws an `Error` for a position that is not one. */
export function ingredientAt(recipe, id, position) {
    const ingredient = recipe.ingredients[position];
    if (ingredient === undefined) {
        throw new Error(`Recipe ${JSON.stringify(id)} has no Ingredient ${position}`);
    }
    return ingredient;
}
