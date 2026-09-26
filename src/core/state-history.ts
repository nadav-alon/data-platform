import { z } from "zod";
import { stateSchema } from "./state.ts";

export const STATE_HISTORY_COLLECTION = "stateHistory";

/**
 * Append-only: entries are only ever created, never updated or deleted.
 * `at` is set by the server.
 */
export const stateHistoryEntrySchema = z.object({
  state: stateSchema,
  at: z.date(),
});

export type StateHistoryEntry = z.infer<typeof stateHistoryEntrySchema>;
