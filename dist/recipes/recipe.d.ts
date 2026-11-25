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
 * `quantity`. `bought` marks an unlinked Ingredient (no Item, not assumed) of a Wanted Recipe as
 * bought; absent means not bought.
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
    bought: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$loose>;
export type Ingredient = z.infer<typeof ingredientSchema>;
/**
 * One document with everything embedded. `wanted` says the Household wants to make it; absent
 * means not wanted. Never versioned and never hard-deleted, so its id stays
 * stable for anything that points at it.
 */
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
        bought: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$loose>>;
    prepSteps: z.ZodArray<z.ZodString>;
    steps: z.ZodArray<z.ZodString>;
    servings: z.ZodOptional<z.ZodNumber>;
    sourceUrl: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    wanted: z.ZodOptional<z.ZodLiteral<true>>;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type Recipe = z.infer<typeof recipeSchema>;
/** An Ingredient without its `bought`: what clearing it, or giving the Ingredient an Item or Assumed, leaves. */
export declare function withoutBought<T extends {
    bought?: unknown;
}>(ingredient: T): Omit<T, "bought">;
/** A Recipe snapshot's data when it is live; throws an `Error` for an unknown or soft-deleted Recipe. */
export declare function liveRecipeData(snapshot: {
    data(): unknown;
}, id: RecipeId): unknown;
/** The Recipe's Ingredient at `position`; throws an `Error` for a position that is not one. */
export declare function ingredientAt(recipe: Recipe, id: RecipeId, position: number): Ingredient;
export {};
