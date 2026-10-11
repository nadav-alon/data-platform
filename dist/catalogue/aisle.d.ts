import { z } from "zod";
export declare const AISLES_COLLECTION = "aisles";
declare const aisleIdBrand: unique symbol;
export type AisleId = string & {
    readonly [aisleIdBrand]: true;
};
export declare function isAisleId(value: string): value is AisleId;
export declare function aisleId(value: string): AisleId;
export declare const aisleIdSchema: z.ZodString & z.ZodType<AisleId, string, z.core.$ZodTypeInternals<AisleId, string>>;
/**
 * A household-wide label for where in a store an Item sits ("dairy", "frozen"), at most one per
 * CatalogueItem and tied to no Shop or Store. Soft-deleting one is allowed while CatalogueItems
 * still carry it, so it holds no reference count.
 */
export declare const aisleSchema: z.ZodObject<{
    name: z.ZodString;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type Aisle = z.infer<typeof aisleSchema>;
export declare const AISLE_NAMES_COLLECTION = "aisleNames";
declare const aisleNameKeyBrand: unique symbol;
/** An Aisle name's key, safe as an `aisleNames` doc id. Only `aisleNameKey` and the guard produce one. */
export type AisleNameKey = string & {
    readonly [aisleNameKeyBrand]: true;
};
/** The guard: a name key (see `isNameKey`) that an Aisle name can reserve. */
export declare function isAisleNameKey(value: string): value is AisleNameKey;
/**
 * The key an Aisle's name reserves, so two live Aisles can't share a name that differs only in
 * case or surrounding spaces. Built exactly as `tagNameKey` builds a Tag's, and `firestore.rules`
 * computes the same key. Throws on a name with no storable key: blank, or one Firestore refuses as
 * a doc id.
 */
export declare function aisleNameKey(name: string): AisleNameKey;
/**
 * `aisleNames/{aisleNameKey(name)}`: held by the one live Aisle with that name, and absent
 * otherwise. An Aisle is created, renamed, restored and soft-deleted in one batch with the
 * reservation it takes or releases.
 */
export declare const aisleNameReservationSchema: z.ZodObject<{
    aisleId: z.ZodString & z.ZodType<AisleId, string, z.core.$ZodTypeInternals<AisleId, string>>;
}, z.core.$loose>;
export type AisleNameReservation = z.infer<typeof aisleNameReservationSchema>;
export {};
