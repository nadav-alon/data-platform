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
  name: z
    .string()
    .refine((name) => normalizeTagName(name).length > 0, "Tag name must not be blank")
    .refine((name) => isTagNameKey(escapedTagName(name)), "Tag name can't be stored as a document id"),
  deletedAt: deletedAtSchema,
});

export type Tag = z.infer<typeof tagSchema>;

export const TAG_NAMES_COLLECTION = "tagNames";

declare const tagNameKeyBrand: unique symbol;

/** A Tag name's key, safe as a `tagNames` doc id. Only `tagNameKey` and the guard produce one. */
export type TagNameKey = string & { readonly [tagNameKeyBrand]: true };

const ESCAPED = /%(?:25|2F)/g;

/**
 * Trims space, tab, newline and carriage return and lowercases A-Z only. Beyond ASCII,
 * `firestore.rules` trims and lowercases a different set of characters than JS does, so a wider
 * key would disagree with the rules; names differing only by non-ASCII case or whitespace stay
 * distinct.
 */
function normalizeTagName(name: string): string {
  return name
    .replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, "")
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

/** Longest key, well inside Firestore's 1500-byte doc id limit at four bytes a character. */
const MAX_TAG_NAME_KEY_LENGTH = 100;

/**
 * The guard: a non-empty, trimmed, lowercased name with `%` and `/` escaped as `%25` and `%2F`,
 * that Firestore accepts as a doc id: not `.` or `..`, not `__.*__`, at most
 * `MAX_TAG_NAME_KEY_LENGTH` characters.
 */
export function isTagNameKey(value: string): value is TagNameKey {
  if (value.length > MAX_TAG_NAME_KEY_LENGTH || value === "." || value === "..") return false;
  if (/^__[\s\S]*__$/.test(value)) return false;
  if (!/^(?:[^%/]|%25|%2F)+$/.test(value)) return false;
  const name = value.replace(ESCAPED, (escape) => (escape === "%25" ? "%" : "/"));
  return name === normalizeTagName(name);
}

/**
 * The key a Tag's name reserves, so two live Tags can't share a name that differs only in case or
 * surrounding spaces. `/` and `%` are escaped so the key is a valid doc id and two names map to
 * one key only when they are equal after trimming and lowercasing. `firestore.rules` computes
 * the same key. Throws on a name with no storable key: blank, or one Firestore refuses as a doc id.
 */
export function tagNameKey(name: string): TagNameKey {
  const key = escapedTagName(name);
  if (!isTagNameKey(key)) {
    throw new Error(`Tag name has no key: ${JSON.stringify(name)}`);
  }
  return key;
}

function escapedTagName(name: string): string {
  return normalizeTagName(name).replaceAll("%", "%25").replaceAll("/", "%2F");
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
