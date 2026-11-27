import { z } from "zod";
import { deletedAtSchema, firestoreTimestampSchema } from "../core/index.ts";
import { foodIdSchema } from "./food.ts";
import { nutritionSchema } from "./nutrition.ts";

/** `nutritionLogs/{uid}`: a Member's log, whose `entries` subcollection holds their Log Entries. */
export const NUTRITION_LOGS_COLLECTION = "nutritionLogs";

/** `nutritionLogs/{uid}/entries/{id}`: one Log Entry per document. */
export const LOG_ENTRIES_COLLECTION = "entries";

declare const logEntryIdBrand: unique symbol;

export type LogEntryId = string & { readonly [logEntryIdBrand]: true };

/** The guard. */
export function isLogEntryId(value: string): value is LogEntryId {
  return value.length > 0;
}

/** The constructor: narrows, or throws naming the offending value. */
export function logEntryId(value: string): LogEntryId {
  if (!isLogEntryId(value)) {
    throw new Error(`LogEntryId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

export const logEntryIdSchema = z.string().refine(isLogEntryId, "LogEntryId must not be empty");

declare const googleHealthIdBrand: unique symbol;

/** The id Google Health gave the data point a Log Entry was pushed as. */
export type GoogleHealthId = string & { readonly [googleHealthIdBrand]: true };

/** The guard. */
export function isGoogleHealthId(value: string): value is GoogleHealthId {
  return value.length > 0;
}

/** The constructor: narrows, or throws naming the offending value. */
export function googleHealthId(value: string): GoogleHealthId {
  if (!isGoogleHealthId(value)) {
    throw new Error(`GoogleHealthId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

const googleHealthIdSchema = z.string().refine(isGoogleHealthId, "GoogleHealthId must not be empty");

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const mealTypeSchema = z.enum(MEAL_TYPES);

export type MealType = z.infer<typeof mealTypeSchema>;

/** What a Log Entry was made from: a saved Food, or a one-off `quick` entry with no Food. */
export const logEntrySourceSchema = z.discriminatedUnion("kind", [
  z.looseObject({ kind: z.literal("food"), foodId: foodIdSchema }),
  z.looseObject({ kind: z.literal("quick") }),
]);

export type LogEntrySource = z.infer<typeof logEntrySourceSchema>;

/**
 * One thing a Member ate (see **Log Entry** in CONTEXT.md). `name` and `nutrition` are snapshots,
 * so editing a Food later never rewrites history; `nutrition` is the entry's totals, for all
 * `servings`. `googleHealthId` is the data point it was pushed as; absent means not yet synced.
 * `googleHealthStale: true` says that data point no longer matches the entry, and is only valid
 * alongside `googleHealthId`; `false` is spelled as absence. A soft-deleted entry still carrying
 * `googleHealthId` is a pending removal from Google Health.
 * `estimated` says the numbers are an estimate, not a label or source; absent means they are not.
 * `eatenAt` accepts a `Date` as well as a Firestore timestamp, as the client writes it.
 */
export const logEntrySchema = z
  .looseObject({
  eatenAt: z.union([z.date(), firestoreTimestampSchema]),
  mealType: mealTypeSchema,
  source: logEntrySourceSchema,
  name: z.string().min(1),
  servings: z.number().positive(),
  nutrition: nutritionSchema,
  googleHealthId: googleHealthIdSchema.optional(),
  googleHealthStale: z.literal(true).optional(),
  estimated: z.literal(true).optional(),
  deletedAt: deletedAtSchema,
})
  .refine((entry) => entry.googleHealthStale === undefined || entry.googleHealthId !== undefined, {
    message: "googleHealthStale is only valid alongside googleHealthId",
    path: ["googleHealthStale"],
  });

export type LogEntry = z.infer<typeof logEntrySchema>;
