import { type Firestore } from "firebase/firestore";
import { z } from "zod";
import { type LogEntryId } from "../nutrition/log-entry.ts";
/**
 * What a caller supplies to log something eaten: a saved Food by `foodId`, or a quick one-off by
 * `name` and per-serving `nutrition`, never both. `estimated` flags a quick entry's numbers as a
 * guess (only `true` is stored; `false` is the same as leaving it out); with a `foodId` it is
 * ignored and the entry takes the Food's own flag. `servings` defaults to 1, `eatenAt` (an ISO
 * 8601 date-time; one with no offset is the machine's local time) to now, and `mealType` to a
 * guess from `eatenAt`'s clock time: the offset it carries, or the machine's local time when it
 * carries none.
 */
export declare const logFoodInputSchema: z.ZodObject<{
    foodId: z.ZodOptional<z.ZodString & z.ZodType<import("../nutrition/food.ts").FoodId, string, z.core.$ZodTypeInternals<import("../nutrition/food.ts").FoodId, string>>>;
    name: z.ZodOptional<z.ZodString>;
    nutrition: z.ZodOptional<z.ZodObject<{
        kcal: z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">;
        proteinG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        carbsG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        fatG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
    }, z.core.$loose>>;
    servings: z.ZodOptional<z.ZodNumber>;
    mealType: z.ZodOptional<z.ZodEnum<{
        breakfast: "breakfast";
        dinner: "dinner";
        lunch: "lunch";
        snack: "snack";
    }>>;
    eatenAt: z.ZodOptional<z.ZodISODateTime>;
    estimated: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type LogFoodInput = z.input<typeof logFoodInputSchema>;
/**
 * Adds a Log Entry to the signed-in Member's own log and returns its id. With a `foodId` the entry
 * snapshots that live Food's name and its per-serving Nutrition times `servings`; a quick entry
 * does the same with the `name` and `nutrition` it is given. Throws when the input names neither
 * or both, or a Food that is missing or soft-deleted, before anything is sent; the write is then
 * checked by `firestore.rules`, so a non-Member's rejects with `permission-denied`.
 */
export declare function logFood(db: Firestore, input: LogFoodInput, now?: Date): Promise<LogEntryId>;
