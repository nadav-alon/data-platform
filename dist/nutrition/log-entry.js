import { z } from "zod";
import { deletedAtSchema, firestoreTimestampSchema } from "../core/index.js";
import { foodIdSchema } from "./food.js";
import { nutritionSchema } from "./nutrition.js";
/** `nutritionLogs/{uid}`: a Member's log, whose `entries` subcollection holds their Log Entries. */
export const NUTRITION_LOGS_COLLECTION = "nutritionLogs";
/** `nutritionLogs/{uid}/entries/{id}`: one Log Entry per document. */
export const LOG_ENTRIES_COLLECTION = "entries";
/** The guard. */
export function isLogEntryId(value) {
    return value.length > 0;
}
/** The constructor: narrows, or throws naming the offending value. */
export function logEntryId(value) {
    if (!isLogEntryId(value)) {
        throw new Error(`LogEntryId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const logEntryIdSchema = z.string().refine(isLogEntryId, "LogEntryId must not be empty");
/** The guard. */
export function isGoogleHealthId(value) {
    return value.length > 0;
}
/** The constructor: narrows, or throws naming the offending value. */
export function googleHealthId(value) {
    if (!isGoogleHealthId(value)) {
        throw new Error(`GoogleHealthId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
const googleHealthIdSchema = z.string().refine(isGoogleHealthId, "GoogleHealthId must not be empty");
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
export const mealTypeSchema = z.enum(MEAL_TYPES);
/** What a Log Entry was made from: a saved Food, or a one-off `quick` entry with no Food. */
export const logEntrySourceSchema = z.discriminatedUnion("kind", [
    z.looseObject({ kind: z.literal("food"), foodId: foodIdSchema }),
    z.looseObject({ kind: z.literal("quick") }),
]);
/**
 * One thing a Member ate (see **Log Entry** in CONTEXT.md). `name` and `nutrition` are snapshots,
 * so editing a Food later never rewrites history; `nutrition` is the entry's totals, for all
 * `servings`. `googleHealthId` is the data point it was pushed as; absent means not yet synced.
 * `eatenAt` accepts a `Date` as well as a Firestore timestamp, as the client writes it.
 */
export const logEntrySchema = z.looseObject({
    eatenAt: z.union([z.date(), firestoreTimestampSchema]),
    mealType: mealTypeSchema,
    source: logEntrySourceSchema,
    name: z.string().min(1),
    servings: z.number().positive(),
    nutrition: nutritionSchema,
    googleHealthId: googleHealthIdSchema.optional(),
    deletedAt: deletedAtSchema,
});
