import { z } from "zod";
declare const kcalSchema: z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">;
declare const gramsSchema: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
/** Kilocalories, at least 0 and finite. */
export type Kcal = z.infer<typeof kcalSchema>;
/** A mass in grams, at least 0 and finite. */
export type Grams = z.infer<typeof gramsSchema>;
/** The guard. */
export declare function isKcal(value: number): value is Kcal;
/** The constructor: narrows, or throws naming the offending value. */
export declare function kcal(value: number): Kcal;
/** The guard. */
export declare function isGrams(value: number): value is Grams;
/** The constructor: narrows, or throws naming the offending value. */
export declare function grams(value: number): Grams;
/**
 * The macros of some amount of food: energy in kilocalories and protein, carbohydrate and fat in
 * grams, each at least 0. A value shape reused inside documents, never a collection of its own.
 */
export declare const nutritionSchema: z.ZodObject<{
    kcal: z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">;
    proteinG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
    carbsG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
    fatG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
}, z.core.$loose>;
export type Nutrition = z.infer<typeof nutritionSchema>;
export {};
