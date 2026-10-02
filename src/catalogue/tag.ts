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
  name: z.string().refine((name) => name.trim().length > 0, "Tag name must not be blank"),
  deletedAt: deletedAtSchema,
});

export type Tag = z.infer<typeof tagSchema>;

export const TAG_NAMES_COLLECTION = "tagNames";

/**
 * The key a Tag's name claims, so two live Tags can't share a name that differs only in case or
 * surrounding spaces. `/` and `%` are escaped so the key is a valid doc id and two names map to
 * one key only when they are equal after trimming and lowercasing. `firestore.rules` computes
 * the same key.
 */
export function tagNameKey(name: string): string {
  return name.trim().toLowerCase().replaceAll("%", "%25").replaceAll("/", "%2F");
}

/**
 * `tagNames/{tagNameKey(name)}`: held by the one live Tag with that name, and absent otherwise.
 * Firestore rules can't query for a duplicate name, so a Tag is created, renamed, restored and
 * soft-deleted in one batch with the claim it takes or releases.
 */
export const tagNameClaimSchema = z.looseObject({
  tagId: tagIdSchema,
});

export type TagNameClaim = z.infer<typeof tagNameClaimSchema>;
