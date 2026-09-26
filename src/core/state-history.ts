import { z } from "zod";
import { stateSchema } from "./state.ts";

export const STATE_HISTORY_COLLECTION = "stateHistory";

/**
 * Duck-types a Firestore `Timestamp` ({ seconds, nanoseconds, toDate() }) without
 * depending on the firebase SDK: `at` reads back as a Timestamp, not a Date.
 */
const timestampSchema = z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
});

/**
 * Append-only: entries are only ever created, never updated or deleted.
 * `at` is set by the server, and accepts either a `Date` or a Firestore `Timestamp`.
 */
export const stateHistoryEntrySchema = z.looseObject({
  state: stateSchema,
  at: z.union([z.date(), timestampSchema]),
});

export type StateHistoryEntry = z.infer<typeof stateHistoryEntrySchema>;
