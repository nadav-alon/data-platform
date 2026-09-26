import { z } from "zod";
import { stateSchema } from "./state.ts";

export const ITEMS_COLLECTION = "items";

export const itemSchema = z.looseObject({
  name: z.string().min(1),
  brandNote: z.string().optional(),
  barcodes: z.array(z.string().min(1)).optional(),
  state: stateSchema,
});

export type Item = z.infer<typeof itemSchema>;
