import { z } from "zod";
export declare const FOODS_COLLECTION = "foods";
declare const foodIdBrand: unique symbol;
export type FoodId = string & {
    readonly [foodIdBrand]: true;
};
export declare function isFoodId(value: string): value is FoodId;
export declare function foodId(value: string): FoodId;
export declare const foodIdSchema: z.ZodString & z.ZodType<FoodId, string, z.core.$ZodTypeInternals<FoodId, string>>;
/**
 * A dish or product the Household has saved that is not a Recipe, shared by the Household.
 * `perServing` is the Nutrition of one serving, which `servingLabel` describes ("1 plate"); `place`
 * is where it is eaten or bought. `estimated` says the numbers are an estimate, not a label or
 * source; absent means they are not.
 */
export declare const foodSchema: z.ZodObject<{
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
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type Food = z.infer<typeof foodSchema>;
export {};
