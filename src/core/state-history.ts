import { z } from "zod";
import { stateSchema } from "./state.ts";
import { firestoreTimestampSchema } from "./timestamp.ts";

export const STATE_HISTORY_COLLECTION = "stateHistory";

/**
 * Append-only: entries are only ever created, never updated or deleted.
 * `at` is set by the server, and accepts either a `Date` (the shape a fresh write reads back
 * as, before the server has assigned it) or a Firestore `Timestamp` (the shape a later read
 * returns). Neither matches the `serverTimestamp()` sentinel a create actually writes, so no
 * create is a `stateHistoryEntrySchema` accept and a `firestore.rules` accept at once: the
 * rules alone enforce `at == request.time` (`firestore.rules`, `isValidStateHistoryEntry`).
 */
export const stateHistoryEntrySchema = z.looseObject({
  state: stateSchema,
  at: z.union([z.date(), firestoreTimestampSchema]),
});

export type StateHistoryEntry = z.infer<typeof stateHistoryEntrySchema>;
