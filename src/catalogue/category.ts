import { z } from "zod";
import { deletedAtSchema } from "../core/deleted-at.ts";
import { referenceCountSchema } from "./reference-count.ts";
import { shopIdSchema } from "./shop.ts";

export const CATEGORIES_COLLECTION = "categories";

declare const categoryIdBrand: unique symbol;

export type CategoryId = string & { readonly [categoryIdBrand]: true };

export function isCategoryId(value: string): value is CategoryId {
  return value.length > 0;
}

export function categoryId(value: string): CategoryId {
  if (!isCategoryId(value)) {
    throw new Error(`CategoryId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

export const categoryIdSchema = z.string().refine(isCategoryId, "CategoryId must not be empty");

export const categorySchema = z.looseObject({
  name: z.string().min(1),
  defaultShopId: shopIdSchema,
  /** CatalogueItems whose `categoryId` points at this Category. */
  referenceCount: referenceCountSchema,
  deletedAt: deletedAtSchema,
});

export type Category = z.infer<typeof categorySchema>;
