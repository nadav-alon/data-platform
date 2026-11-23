import { z } from "zod";
import { deletedAtSchema } from "../core/index.js";
import { escapeName, isNameKey, normalizeName } from "./name-key.js";
export const TAGS_COLLECTION = "tags";
export function isTagId(value) {
    return value.length > 0;
}
export function tagId(value) {
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
        .refine((name) => normalizeName(name).length > 0, "Tag name must not be blank")
        .refine((name) => isTagNameKey(escapeName(name)), "Tag name can't be stored as a document id"),
    deletedAt: deletedAtSchema,
});
export const TAG_NAMES_COLLECTION = "tagNames";
/** The guard: a name key (see `isNameKey`) that a Tag name can reserve. */
export function isTagNameKey(value) {
    return isNameKey(value);
}
/**
 * The key a Tag's name reserves, so two live Tags can't share a name that differs only in case or
 * surrounding spaces. `/` and `%` are escaped so the key is a valid doc id and two names map to
 * one key only when they are equal after trimming and lowercasing. `firestore.rules` computes
 * the same key. Throws on a name with no storable key: blank, or one Firestore refuses as a doc id.
 */
export function tagNameKey(name) {
    const key = escapeName(name);
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
