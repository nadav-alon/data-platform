import { z } from "zod";
export declare const stateSchema: z.ZodEnum<{
    enough: "enough";
    out: "out";
    "running low": "running low";
}>;
export type State = z.infer<typeof stateSchema>;
