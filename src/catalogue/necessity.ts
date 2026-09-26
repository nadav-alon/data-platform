import { z } from "zod";

export const necessitySchema = z.enum(["essential", "important", "optional"]);

export type Necessity = z.infer<typeof necessitySchema>;
