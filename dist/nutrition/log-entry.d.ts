import { z } from "zod";
/** `nutritionLogs/{uid}`: a Member's log, whose `entries` subcollection holds their Log Entries. */
export declare const NUTRITION_LOGS_COLLECTION = "nutritionLogs";
/** `nutritionLogs/{uid}/entries/{id}`: one Log Entry per document. */
export declare const LOG_ENTRIES_COLLECTION = "entries";
declare const logEntryIdBrand: unique symbol;
export type LogEntryId = string & {
    readonly [logEntryIdBrand]: true;
};
/** The guard. */
export declare function isLogEntryId(value: string): value is LogEntryId;
/** The constructor: narrows, or throws naming the offending value. */
export declare function logEntryId(value: string): LogEntryId;
export declare const logEntryIdSchema: z.ZodString & z.ZodType<LogEntryId, string, z.core.$ZodTypeInternals<LogEntryId, string>>;
declare const googleHealthIdBrand: unique symbol;
/** The id Google Health gave the data point a Log Entry was pushed as. */
export type GoogleHealthId = string & {
    readonly [googleHealthIdBrand]: true;
};
/** The guard. */
export declare function isGoogleHealthId(value: string): value is GoogleHealthId;
/** The constructor: narrows, or throws naming the offending value. */
export declare function googleHealthId(value: string): GoogleHealthId;
export declare const MEAL_TYPES: readonly ["breakfast", "lunch", "dinner", "snack"];
export declare const mealTypeSchema: z.ZodEnum<{
    breakfast: "breakfast";
    dinner: "dinner";
    lunch: "lunch";
    snack: "snack";
}>;
export type MealType = z.infer<typeof mealTypeSchema>;
/** What a Log Entry was made from: a saved Food, or a one-off `quick` entry with no Food. */
export declare const logEntrySourceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"food">;
    foodId: z.ZodString & z.ZodType<import("./food.ts").FoodId, string, z.core.$ZodTypeInternals<import("./food.ts").FoodId, string>>;
}, z.core.$loose>, z.ZodObject<{
    kind: z.ZodLiteral<"quick">;
}, z.core.$loose>], "kind">;
export type LogEntrySource = z.infer<typeof logEntrySourceSchema>;
/**
 * One thing a Member ate (see **Log Entry** in CONTEXT.md). `name` and `nutrition` are snapshots,
 * so editing a Food later never rewrites history; `nutrition` is the entry's totals, for all
 * `servings`. `googleHealthId` is the data point it was pushed as; absent means not yet synced.
 * `estimated` says the numbers are an estimate, not a label or source; absent means they are not.
 * `eatenAt` accepts a `Date` as well as a Firestore timestamp, as the client writes it.
 */
export declare const logEntrySchema: z.ZodObject<{
    eatenAt: z.ZodUnion<readonly [z.ZodDate, z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>]>;
    mealType: z.ZodEnum<{
        breakfast: "breakfast";
        dinner: "dinner";
        lunch: "lunch";
        snack: "snack";
    }>;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"food">;
        foodId: z.ZodString & z.ZodType<import("./food.ts").FoodId, string, z.core.$ZodTypeInternals<import("./food.ts").FoodId, string>>;
    }, z.core.$loose>, z.ZodObject<{
        kind: z.ZodLiteral<"quick">;
    }, z.core.$loose>], "kind">;
    name: z.ZodString;
    servings: z.ZodNumber;
    nutrition: z.ZodObject<{
        kcal: z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">;
        proteinG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        carbsG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
        fatG: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
    }, z.core.$loose>;
    googleHealthId: z.ZodOptional<z.ZodString & z.ZodType<GoogleHealthId, string, z.core.$ZodTypeInternals<GoogleHealthId, string>>>;
    estimated: z.ZodOptional<z.ZodLiteral<true>>;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type LogEntry = z.infer<typeof logEntrySchema>;
export {};
