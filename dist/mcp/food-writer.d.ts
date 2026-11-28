import { type Firestore } from "firebase/firestore";
import { z } from "zod";
import { type FoodId } from "../nutrition/food.ts";
/**
 * What a caller supplies to add a Food: a live Food, so never a `deletedAt`, and no key the schema
 * does not name (the stored Food schema is loose; this input is strict).
 */
export declare const newFoodSchema: z.ZodObject<{
    name: z.ZodString;
    place: z.ZodOptional<z.ZodString>;
    perServing: z.ZodObject<{
        kcal: z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">;
        proteinG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        carbsG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        fatG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
    }, z.core.$loose>;
    servingLabel: z.ZodOptional<z.ZodString>;
    estimated: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>;
export type NewFood = z.input<typeof newFoodSchema>;
/**
 * Adds a live Food and returns its id. The input is validated by the Food zod schema before
 * anything is sent, and throws a `ZodError` when it is refused; the write is then checked by
 * `firestore.rules` as the signed-in Member, so a non-Member's write rejects with Firestore's
 * `permission-denied`.
 */
export declare function addFood(db: Firestore, input: NewFood): Promise<FoodId>;
/**
 * Which Food changes and its new Nutrition: `perServing` and `estimated` are validated as `addFood`
 * validates them, and no other key is accepted.
 */
export declare const setFoodNutritionSchema: z.ZodObject<{
    foodId: z.ZodString & z.ZodType<FoodId, string, z.core.$ZodTypeInternals<FoodId, string>>;
    perServing: z.ZodObject<{
        kcal: z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">;
        proteinG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        carbsG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        fatG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
    }, z.core.$loose>;
    estimated: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>;
export type SetFoodNutrition = z.input<typeof setFoodNutritionSchema>;
/**
 * Replaces a live Food's `perServing` Nutrition and its `estimated` flag (left out clears it: the
 * numbers are then taken from a label or source), keeping its other fields. Existing Log Entries
 * hold their own snapshot and are not touched. The input is validated by `setFoodNutritionSchema`
 * and the resulting Food by the Food schema before anything is sent; a `ZodError` is thrown when
 * either is refused (so a legacy Food that no longer passes the schema cannot be fixed here), and an `Error` for an unknown or soft-deleted Food. The write is then checked
 * by `firestore.rules` as the signed-in Member.
 */
export declare function setFoodNutrition(db: Firestore, input: SetFoodNutrition): Promise<FoodId>;
