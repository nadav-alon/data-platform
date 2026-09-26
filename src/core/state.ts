import { z } from "zod";

export const stateSchema = z.enum(["enough", "running low", "out"]);

export type State = z.infer<typeof stateSchema>;
