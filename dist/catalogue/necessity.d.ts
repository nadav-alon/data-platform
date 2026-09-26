import { z } from "zod";
export declare const necessitySchema: z.ZodEnum<{
    essential: "essential";
    important: "important";
    optional: "optional";
}>;
export type Necessity = z.infer<typeof necessitySchema>;
