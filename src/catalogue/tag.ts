import { z } from "zod";
import { deletedAtSchema } from "../core/index.ts";

export const TAGS_COLLECTION = "tags";

declare const tagIdBrand: unique symbol;

export type TagId = string & { readonly [tagIdBrand]: true };

export function isTagId(value: string): value is TagId {
  return value.length > 0;
}

export function tagId(value: string): TagId {
  if (!isTagId(value)) {
    throw new Error(`TagId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

export const tagIdSchema = z.string().refine(isTagId, "TagId must not be empty");

/**
 * A household-defined label for finding CatalogueItems across Categories: many per CatalogueItem,
 * no Shop. Soft-deleting one is allowed while CatalogueItems still carry it, so it holds no
 * reference count.
 */
export const tagSchema = z.looseObject({
  name: z.string().min(1),
  deletedAt: deletedAtSchema,
});

export type Tag = z.infer<typeof tagSchema>;
