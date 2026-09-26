import { z } from "zod";
export declare const ITEMS_COLLECTION = "items";
export declare const itemSchema: z.ZodObject<{
    name: z.ZodString;
    brandNote: z.ZodOptional<z.ZodString>;
    barcodes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    state: z.ZodEnum<{
        enough: "enough";
        out: "out";
        "running low": "running low";
    }>;
}, z.core.$loose>;
export type Item = z.infer<typeof itemSchema>;
