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
 * `quantity`.
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
 * One document with everything embedded. Never versioned and never hard-deleted, so its id stays
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
    }, z.core.$loose>>;
    prepSteps: z.ZodArray<z.ZodString>;
    steps: z.ZodArray<z.ZodString>;
    servings: z.ZodOptional<z.ZodNumber>;
    sourceUrl: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type Recipe = z.infer<typeof recipeSchema>;
export {};
