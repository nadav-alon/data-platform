import { z } from "zod";

export const SHOPS_COLLECTION = "shops";

declare const shopIdBrand: unique symbol;

export type ShopId = string & { readonly [shopIdBrand]: true };

export function isShopId(value: string): value is ShopId {
  return value.length > 0;
}

export function shopId(value: string): ShopId {
  if (!isShopId(value)) {
    throw new Error(`ShopId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

export const shopIdSchema = z.string().refine(isShopId, "ShopId must not be empty");

/**
 * A kind of place (pharmacy, grocery), not a specific store.
 */
export const shopSchema = z.looseObject({
  name: z.string().min(1),
});

export type Shop = z.infer<typeof shopSchema>;
