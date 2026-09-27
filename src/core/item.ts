import { z } from "zod";
import { barcodeSchema } from "./barcode.ts";
import { stateSchema } from "./state.ts";

export const ITEMS_COLLECTION = "items";

declare const itemIdBrand: unique symbol;

export type ItemId = string & { readonly [itemIdBrand]: true };

export function isItemId(value: string): value is ItemId {
  return value.length > 0;
}

export function itemId(value: string): ItemId {
  if (!isItemId(value)) {
    throw new Error(`ItemId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

export const itemIdSchema = z.string().refine(isItemId, "ItemId must not be empty");

export const itemSchema = z.looseObject({
  name: z.string().min(1),
  brandNote: z.string().optional(),
  barcodes: z.array(barcodeSchema).optional(),
  state: stateSchema,
});

export type Item = z.infer<typeof itemSchema>;
