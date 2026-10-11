import { z } from "zod";
import { deletedAtSchema } from "../core/index.ts";
import { aisleIdSchema } from "./aisle.ts";
import { normalizeName } from "./name-key.ts";
import { shopIdSchema } from "./shop.ts";

export const STORES_COLLECTION = "stores";

declare const storeIdBrand: unique symbol;

export type StoreId = string & { readonly [storeIdBrand]: true };

export function isStoreId(value: string): value is StoreId {
  return value.length > 0;
}

export function storeId(value: string): StoreId {
  if (!isStoreId(value)) {
    throw new Error(`StoreId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

export const storeIdSchema = z.string().refine(isStoreId, "StoreId must not be empty");

/**
 * A named store under one Shop ("Osher Ad" under "grocery"). Branches aren't modelled: a second
 * differing branch is another Store with a longer name. Nothing references a Store, so it holds
 * no reference count and doesn't count toward its Shop's.
 */
export const storeSchema = z.looseObject({
  name: z.string().refine((name) => normalizeName(name).length > 0, "Store name must not be blank"),
  shopId: shopIdSchema,
  /**
   * This store's Aisles in the order one walks them, soft-deleted ones included; empty when no
   * order is set. An Aisle appears at most once.
   */
  aisleOrder: z
    .array(aisleIdSchema)
    .refine((ids) => new Set(ids).size === ids.length, "aisleOrder must not repeat an Aisle")
    .default([]),
  deletedAt: deletedAtSchema,
});

export type Store = z.infer<typeof storeSchema>;
