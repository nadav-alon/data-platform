import { type Firestore } from "firebase/firestore";
import { z } from "zod";
import { type RecipeId } from "../recipes/recipe.ts";
/**
 * What a caller supplies to add a Recipe: a live Recipe, so never a `deletedAt` or a Bought, and no key the
 * schema does not name (the stored Recipe schema is loose; this input is strict).
 */
export declare const newRecipeSchema: z.ZodObject<{
    title: z.ZodString;
    ingredients: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        itemId: z.ZodOptional<z.ZodString & z.ZodType<import("../core/item.ts").ItemId, string, z.core.$ZodTypeInternals<import("../core/item.ts").ItemId, string>>>;
        assumed: z.ZodOptional<z.ZodLiteral<true>>;
        quantity: z.ZodOptional<z.ZodNumber>;
        unit: z.ZodOptional<z.ZodEnum<{
            cup: "cup";
            g: "g";
            kg: "kg";
            l: "l";
            ml: "ml";
            piece: "piece";
            tbsp: "tbsp";
            tsp: "tsp";
        }>>;
        prepNote: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    prepSteps: z.ZodArray<z.ZodString>;
    steps: z.ZodArray<z.ZodString>;
    servings: z.ZodOptional<z.ZodNumber>;
    sourceUrl: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    wanted: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>;
export type NewRecipe = z.input<typeof newRecipeSchema>;
/**
 * Adds a live Recipe with its Ingredients and returns its id. The input is validated by the
 * Recipe zod schema before anything is sent, and throws a `ZodError` when it is refused; the write
 * is then checked by `firestore.rules` as the signed-in Member, so a non-Member's write rejects
 * with Firestore's `permission-denied`.
 */
export declare function addRecipe(db: Firestore, input: NewRecipe): Promise<RecipeId>;
