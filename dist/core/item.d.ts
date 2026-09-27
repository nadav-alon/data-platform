import { z } from "zod";
export declare const ITEMS_COLLECTION = "items";
declare const itemIdBrand: unique symbol;
export type ItemId = string & {
    readonly [itemIdBrand]: true;
};
export declare function isItemId(value: string): value is ItemId;
export declare function itemId(value: string): ItemId;
export declare const itemIdSchema: z.ZodString & z.ZodType<ItemId, string, z.core.$ZodTypeInternals<ItemId, string>>;
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
export {};
