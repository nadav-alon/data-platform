import { z } from "zod";
export declare const TAGS_COLLECTION = "tags";
declare const tagIdBrand: unique symbol;
export type TagId = string & {
    readonly [tagIdBrand]: true;
};
export declare function isTagId(value: string): value is TagId;
export declare function tagId(value: string): TagId;
export declare const tagIdSchema: z.ZodString & z.ZodType<TagId, string, z.core.$ZodTypeInternals<TagId, string>>;
/**
 * A household-defined label for finding CatalogueItems across Categories: many per CatalogueItem,
 * no Shop. Soft-deleting one is allowed while CatalogueItems still carry it, so it holds no
 * reference count.
 */
export declare const tagSchema: z.ZodObject<{
    name: z.ZodString;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type Tag = z.infer<typeof tagSchema>;
export declare const TAG_NAMES_COLLECTION = "tagNames";
declare const tagNameKeyBrand: unique symbol;
/** A Tag name's key, safe as a `tagNames` doc id. Only `tagNameKey` and the guard produce one. */
export type TagNameKey = string & {
    readonly [tagNameKeyBrand]: true;
};
/**
 * The guard: a non-empty, trimmed, lowercased name with `%` and `/` escaped as `%25` and `%2F`,
 * that Firestore accepts as a doc id: not `.` or `..`, not `__.*__`, at most
 * `MAX_TAG_NAME_KEY_LENGTH` characters.
 */
export declare function isTagNameKey(value: string): value is TagNameKey;
/**
 * The key a Tag's name reserves, so two live Tags can't share a name that differs only in case or
 * surrounding spaces. `/` and `%` are escaped so the key is a valid doc id and two names map to
 * one key only when they are equal after trimming and lowercasing. `firestore.rules` computes
 * the same key. Throws on a name with no storable key: blank, or one Firestore refuses as a doc id.
 */
export declare function tagNameKey(name: string): TagNameKey;
/**
 * `tagNames/{tagNameKey(name)}`: held by the one live Tag with that name, and absent otherwise.
 * Firestore rules can't query for a duplicate name, so a Tag is created, renamed, restored and
 * soft-deleted in one batch with the reservation it takes or releases.
 */
export declare const tagNameReservationSchema: z.ZodObject<{
    tagId: z.ZodString & z.ZodType<TagId, string, z.core.$ZodTypeInternals<TagId, string>>;
}, z.core.$loose>;
export type TagNameReservation = z.infer<typeof tagNameReservationSchema>;
export {};
