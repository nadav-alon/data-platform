import { z } from "zod";
import { deletedAtSchema } from "../core/index.js";
import { escapeName, isNameKey, normalizeName } from "./name-key.js";
export const AISLES_COLLECTION = "aisles";
export function isAisleId(value) {
    return value.length > 0;
}
export function aisleId(value) {
    if (!isAisleId(value)) {
        throw new Error(`AisleId must not be empty, got ${JSON.stringify(value)}`);
    }
    return value;
}
export const aisleIdSchema = z.string().refine(isAisleId, "AisleId must not be empty");
/**
 * A household-wide label for where in a store an Item sits ("dairy", "frozen"), at most one per
 * CatalogueItem and tied to no Shop or Store. Soft-deleting one is allowed while CatalogueItems
 * still carry it, so it holds no reference count.
 */
export const aisleSchema = z.looseObject({
    name: z
        .string()
        .refine((name) => normalizeName(name).length > 0, "Aisle name must not be blank")
        .refine((name) => isNameKey(escapeName(name)), "Aisle name can't be stored as a document id"),
    deletedAt: deletedAtSchema,
});
export const AISLE_NAMES_COLLECTION = "aisleNames";
/** The guard: a name key (see `isNameKey`) that an Aisle name can reserve. */
export function isAisleNameKey(value) {
    return isNameKey(value);
}
/**
 * The key an Aisle's name reserves, so two live Aisles can't share a name that differs only in
 * case or surrounding spaces. Built exactly as `tagNameKey` builds a Tag's, and `firestore.rules`
 * computes the same key. Throws on a name with no storable key: blank, or one Firestore refuses as
 * a doc id.
 */
export function aisleNameKey(name) {
    const key = escapeName(name);
    if (!isAisleNameKey(key)) {
        throw new Error(`Aisle name has no key: ${JSON.stringify(name)}`);
    }
    return key;
}
/**
 * `aisleNames/{aisleNameKey(name)}`: held by the one live Aisle with that name, and absent
 * otherwise. An Aisle is created, renamed, restored and soft-deleted in one batch with the
 * reservation it takes or releases.
 */
export const aisleNameReservationSchema = z.looseObject({
    aisleId: aisleIdSchema,
});
