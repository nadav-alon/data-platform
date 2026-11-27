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
