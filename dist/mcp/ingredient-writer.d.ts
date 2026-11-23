import { type Firestore } from "firebase/firestore";
import { z } from "zod";
import { type RecipeId } from "../recipes/recipe.ts";
/**
 * What an Ingredient becomes: linked to an Item, assumed (a staple that names no Item), or
 * unlinked (names neither).
 */
export declare const ingredientLinkSchema: z.ZodUnion<readonly [z.ZodObject<{
    itemId: z.ZodString & z.ZodType<import("../core/item.ts").ItemId, string, z.core.$ZodTypeInternals<import("../core/item.ts").ItemId, string>>;
}, z.core.$strict>, z.ZodObject<{
    assumed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{}, z.core.$strict>]>;
export type IngredientLink = z.input<typeof ingredientLinkSchema>;
/** Which Ingredient of which Recipe changes, and what it becomes. `ingredient` is its 0-based position in the Recipe. */
export declare const setIngredientLinkSchema: z.ZodObject<{
    recipeId: z.ZodString & z.ZodType<RecipeId, string, z.core.$ZodTypeInternals<RecipeId, string>>;
    ingredient: z.ZodNumber;
    link: z.ZodUnion<readonly [z.ZodObject<{
        itemId: z.ZodString & z.ZodType<import("../core/item.ts").ItemId, string, z.core.$ZodTypeInternals<import("../core/item.ts").ItemId, string>>;
    }, z.core.$strict>, z.ZodObject<{
        assumed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strict>]>;
}, z.core.$strict>;
export type SetIngredientLink = z.input<typeof setIngredientLinkSchema>;
/**
 * Links one Ingredient of a live Recipe to an Item, marks it assumed, or unlinks it (an empty
 * `link`), leaving its other fields as stored; linking or assuming also clears `bought`, which only an
 * unlinked Ingredient carries. The input is validated by `setIngredientLinkSchema`
 * (a `link` naming both an Item and Assumed is refused there) and the resulting Ingredients by the
 * Recipe schema's `ingredients` shape before anything is sent; a `ZodError` is thrown when either
 * is refused. An unknown or soft-deleted Recipe, or a position past its last Ingredient, throws an `Error`.
 * The write is then checked by `firestore.rules` as the signed-in Member.
 */
export declare function setIngredientLink(db: Firestore, input: SetIngredientLink): Promise<RecipeId>;
