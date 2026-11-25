import { deleteField, doc, runTransaction, type Firestore } from "firebase/firestore";
import { z } from "zod";
import { itemIdSchema } from "../core/item.ts";
import {
  BOUGHT_FIELD,
  RECIPES_COLLECTION,
  ingredientAt,
  isUnlinked,
  liveRecipeData,
  recipeId as toRecipeId,
  recipeIdSchema,
  recipeObjectSchema,
  recipeSchema,
  type RecipeId,
} from "../recipes/recipe.ts";

/**
 * What an Ingredient becomes: linked to an Item, assumed (a staple that names no Item), or
 * unlinked (names neither).
 */
export const ingredientLinkSchema = z.union([
  z.strictObject({ itemId: itemIdSchema }),
  z.strictObject({ assumed: z.literal(true) }),
  z.strictObject({}),
]);

export type IngredientLink = z.input<typeof ingredientLinkSchema>;

/** Which Ingredient of which Recipe changes, and what it becomes. `ingredient` is its 0-based position in the Recipe. */
export const setIngredientLinkSchema = z.strictObject({
  recipeId: recipeIdSchema,
  ingredient: z.number().int().nonnegative(),
  link: ingredientLinkSchema,
});

export type SetIngredientLink = z.input<typeof setIngredientLinkSchema>;

/**
 * Links one Ingredient of a live Recipe to an Item, marks it assumed, or unlinks it (an empty
 * `link`), leaving its other fields as stored; linking or assuming also clears its Bought (`boughtIngredients`), which only an
 * unlinked Ingredient carries. The input is validated by `setIngredientLinkSchema`
 * (a `link` naming both an Item and Assumed is refused there) and the resulting Ingredients by the
 * Recipe schema's `ingredients` shape before anything is sent; a `ZodError` is thrown when either
 * is refused. An unknown or soft-deleted Recipe, or a position past its last Ingredient, throws an `Error`.
 * The write is then checked by `firestore.rules` as the signed-in Member.
 */
export async function setIngredientLink(db: Firestore, input: SetIngredientLink): Promise<RecipeId> {
  const { recipeId, ingredient: position, link } = setIngredientLinkSchema.parse(input);
  const ref = doc(db, RECIPES_COLLECTION, recipeId);
  await runTransaction(db, async (transaction) => {
    const id = toRecipeId(recipeId);
    const recipe = recipeSchema.parse(liveRecipeData(await transaction.get(ref), id));
    const current = ingredientAt(recipe, id, position);
    const { itemId: _itemId, assumed: _assumed, ...unlinked } = current;
    const ingredients = recipe.ingredients.map((existing, index) =>
      index === position ? { ...unlinked, ...link } : existing,
    );
    const stillUnlinked = (name: string) => ingredients.some((i) => i.name === name && isUnlinked(i));
    const boughtBefore = Object.keys(recipe.boughtIngredients ?? {});
    const bought = boughtBefore.filter(stillUnlinked);
    const update: Record<string, unknown> = { ingredients: recipeObjectSchema.shape.ingredients.parse(ingredients) };
    if (bought.length !== boughtBefore.length) {
      update[BOUGHT_FIELD] =
        bought.length === 0 ? deleteField() : Object.fromEntries(bought.map((name) => [name, true]));
    }
    transaction.update(ref, update);
  });
  return toRecipeId(recipeId);
}
