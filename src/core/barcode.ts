import { z } from "zod";

const BARCODE_PATTERN = /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/;

/** A barcode value read from a scan or entered by a Member: a GTIN of length 8, 12, 13 or 14, digits only, no check-digit validation. */
const barcodeSchema = z.string().regex(BARCODE_PATTERN).brand<"Barcode">();

export type Barcode = z.infer<typeof barcodeSchema>;

export function isBarcode(value: string): value is Barcode {
  return barcodeSchema.safeParse(value).success;
}

export function barcode(value: string): Barcode {
  const result = barcodeSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Not a Barcode: ${JSON.stringify(value)}`);
  }
  return result.data;
}

export { barcodeSchema };
