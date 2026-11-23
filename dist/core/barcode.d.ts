import { z } from "zod";
/** A barcode value read from a scan or entered by a Member: a GTIN of length 8, 12, 13 or 14, digits only, no check-digit validation. */
declare const barcodeSchema: z.core.$ZodBranded<z.ZodString, "Barcode", "out">;
export type Barcode = z.infer<typeof barcodeSchema>;
export declare function isBarcode(value: string): value is Barcode;
export declare function barcode(value: string): Barcode;
export { barcodeSchema };
