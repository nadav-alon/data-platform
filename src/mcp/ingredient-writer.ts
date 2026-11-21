import { doc, runTransaction, type Firestore } from "firebase/firestore";
import { z } from "zod";
import { itemIdSchema } from "../core/item.ts";
import {
  RECIPES_COLLECTION,
  recipeIdSchema,
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
 * `link`), leaving its other fields as stored. The input and the resulting Recipe are validated by
 * the Recipe zod schema before anything is sent, and a `ZodError` is thrown when either is refused;
 * an unknown or soft-deleted Recipe, or a position past its last Ingredient, throws an `Error`.
 * The write is then checked by `firestore.rules` as the signed-in Member.
 */
export async function setIngredientLink(db: Firestore, input: SetIngredientLink): Promise<RecipeId> {
  const { recipeId, ingredient: position, link } = setIngredientLinkSchema.parse(input);
  const ref = doc(db, RECIPES_COLLECTION, recipeId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    if (data === undefined || data.deletedAt !== undefined) {
      throw new Error(`No live Recipe ${JSON.stringify(recipeId)}`);
    }
    const recipe = recipeSchema.parse(data);
    const current = recipe.ingredients[position];
    if (current === undefined) {
      throw new Error(`Recipe ${JSON.stringify(recipeId)} has no Ingredient ${position}`);
    }
    const { itemId: _itemId, assumed: _assumed, ...rest } = current;
    const ingredients = recipe.ingredients.map((existing, index) =>
      index === position ? { ...rest, ...link } : existing,
    );
    transaction.update(ref, { ingredients: recipeSchema.shape.ingredients.parse(ingredients) });
  });
  return recipeId as RecipeId;
}
