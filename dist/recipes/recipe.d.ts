import { z } from "zod";
export declare const RECIPES_COLLECTION = "recipes";
declare const recipeIdBrand: unique symbol;
export type RecipeId = string & {
    readonly [recipeIdBrand]: true;
};
export declare function isRecipeId(value: string): value is RecipeId;
export declare function recipeId(value: string): RecipeId;
export declare const recipeIdSchema: z.ZodString & z.ZodType<RecipeId, string, z.core.$ZodTypeInternals<RecipeId, string>>;
/** The units an Ingredient's `quantity` can be measured in. */
export declare const INGREDIENT_UNITS: readonly ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece"];
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];
/**
 * One line of a Recipe. `itemId` links it to a Core Item; `assumed` marks a staple taken as
 * already in the house, so it never names an Item. A `unit` only means something beside a
 * `quantity`. Bought: see `Recipe.boughtIngredients`.
 */
export declare const ingredientSchema: z.ZodObject<{
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
}, z.core.$loose>;
export type Ingredient = z.infer<typeof ingredientSchema>;
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
export declare const BOUGHT_FIELD = "boughtIngredients";
/** Whether an Ingredient names neither an Item nor Assumed: the only kind that can be bought. */
export declare function isUnlinked(ingredient: Ingredient): boolean;
export declare const recipeObjectSchema: z.ZodObject<{
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
    boughtIngredients: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLiteral<true>>>;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export declare const recipeSchema: z.ZodObject<{
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
    boughtIngredients: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodLiteral<true>>>;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type Recipe = z.infer<typeof recipeSchema>;
/** A Recipe snapshot's data when it is live; throws an `Error` for an unknown or soft-deleted Recipe. */
export declare function liveRecipeData(snapshot: {
    data(): unknown;
}, id: RecipeId): unknown;
/** The Recipe's Ingredient at `position`; throws an `Error` for a position that is not one. */
export declare function ingredientAt(recipe: Recipe, id: RecipeId, position: number): Ingredient;
export {};
