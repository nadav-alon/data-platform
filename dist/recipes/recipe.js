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
 * `quantity`.
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
 * One document with everything embedded. Never versioned and never hard-deleted, so its id stays
 * stable for anything that points at it.
 */
export const recipeSchema = z.looseObject({
    title: z.string().min(1),
    ingredients: z.array(ingredientSchema),
    prepSteps: z.array(z.string().min(1)),
    steps: z.array(z.string().min(1)),
    servings: z.number().int().positive().optional(),
    sourceUrl: z.string().optional(),
    notes: z.string().optional(),
    deletedAt: deletedAtSchema,
});
