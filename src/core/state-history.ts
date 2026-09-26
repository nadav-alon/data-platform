import { z } from "zod";
import { stateSchema } from "./state.ts";

export const STATE_HISTORY_COLLECTION = "stateHistory";

export const stateHistoryEntrySchema = z.object({
  state: stateSchema,
  at: z.date(),
});

export type StateHistoryEntry = z.infer<typeof stateHistoryEntrySchema>;
