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

declare const tagNameKeyBrand: unique symbol;

/** A Tag name's key, safe as a `tagNames` doc id. Only `tagNameKey` and the guard produce one. */
export type TagNameKey = string & { readonly [tagNameKeyBrand]: true };

const ESCAPED = /%(?:25|2F)/g;

function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

/** The guard: a non-empty, trimmed, lowercased name with `%` and `/` escaped as `%25` and `%2F`. */
export function isTagNameKey(value: string): value is TagNameKey {
  if (!/^(?:[^%/]|%25|%2F)+$/.test(value)) return false;
  const name = value.replace(ESCAPED, (escape) => (escape === "%25" ? "%" : "/"));
  return name === normalizeTagName(name);
}

/**
 * The key a Tag's name reserves, so two live Tags can't share a name that differs only in case or
 * surrounding spaces. `/` and `%` are escaped so the key is a valid doc id and two names map to
 * one key only when they are equal after trimming and lowercasing. `firestore.rules` computes
 * the same key. Throws on a blank name, which has no key.
 */
export function tagNameKey(name: string): TagNameKey {
  const key = normalizeTagName(name).replaceAll("%", "%25").replaceAll("/", "%2F");
  if (!isTagNameKey(key)) {
    throw new Error(`Tag name has no key: ${JSON.stringify(name)}`);
  }
  return key;
}

/**
 * `tagNames/{tagNameKey(name)}`: held by the one live Tag with that name, and absent otherwise.
 * Firestore rules can't query for a duplicate name, so a Tag is created, renamed, restored and
 * soft-deleted in one batch with the reservation it takes or releases.
 */
export const tagNameReservationSchema = z.looseObject({
  tagId: tagIdSchema,
});

export type TagNameReservation = z.infer<typeof tagNameReservationSchema>;
