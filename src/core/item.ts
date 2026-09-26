import { z } from "zod";
import { stateSchema } from "./state.ts";

export const ITEMS_COLLECTION = "items";

export const itemSchema = z.object({
  name: z.string().min(1),
  brandNote: z.string().optional(),
  barcodes: z.array(z.string()).optional(),
  state: stateSchema,
});

export type Item = z.infer<typeof itemSchema>;
