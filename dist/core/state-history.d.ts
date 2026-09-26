import { z } from "zod";
export declare const STATE_HISTORY_COLLECTION = "stateHistory";
/**
 * Append-only: entries are only ever created, never updated or deleted.
 * `at` is set by the server, and accepts either a `Date` or a Firestore `Timestamp`.
 */
export declare const stateHistoryEntrySchema: z.ZodObject<{
    state: z.ZodEnum<{
        enough: "enough";
        out: "out";
        "running low": "running low";
    }>;
    at: z.ZodUnion<readonly [z.ZodDate, z.ZodObject<{
        seconds: z.ZodNumber;
        nanoseconds: z.ZodNumber;
    }, z.core.$strip>]>;
}, z.core.$loose>;
export type StateHistoryEntry = z.infer<typeof stateHistoryEntrySchema>;
