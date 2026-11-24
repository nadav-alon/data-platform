import { type CatalogueItem } from "./catalogue-item.ts";
import { type Category, type CategoryId } from "./category.ts";
import type { ReferenceCount } from "./reference-count.ts";
import { type ShopId } from "./shop.ts";
/** `softDeleted` is set only for a doc carrying a `deletedAt`; such a doc holds no reference. */
type SoftDeleteMarker = {
    readonly softDeleted?: true;
};
type ExistingCategory = Pick<Category, "defaultShopId"> & SoftDeleteMarker;
type ExistingCatalogueItem = Pick<CatalogueItem, "categoryId" | "shopId"> & SoftDeleteMarker;
/** Enough of a Household's existing Shops, Categories and CatalogueItems to recompute referenceCount. */
export type ExistingCatalogue = {
    readonly shopIds: readonly ShopId[];
    readonly categories: ReadonlyMap<CategoryId, ExistingCategory>;
    readonly catalogueItems: readonly ExistingCatalogueItem[];
};
export type ReferenceCounts = {
    readonly shops: ReadonlyMap<ShopId, ReferenceCount>;
    readonly categories: ReadonlyMap<CategoryId, ReferenceCount>;
};
/**
 * Every existing Shop and Category's referenceCount, recomputed from what currently references
 * it rather than trusted from the document itself — safe to run more than once. A `defaultShopId`
 * or `categoryId`/`shopId` naming a doc outside `existing` is not counted: that reference is
 * already broken, and backfilling can't repair it. A soft-deleted Category or CatalogueItem holds
 * no reference, so it adds to no count (a Category still gets a count of its own).
 */
export declare function computeReferenceCounts(existing: ExistingCatalogue): ReferenceCounts;
/** A Firestore doc as read by the Admin SDK, before its fields are trusted to be well-formed. */
export type FirestoreDoc = {
    readonly id: string;
    readonly data: Record<string, unknown>;
};
/** A doc the backfill left out of `existing`, and why — logged rather than thrown. */
export type SkippedDoc = {
    readonly collection: string;
    readonly id: string;
    readonly reason: string;
};
/**
 * Reads Shop, Category and CatalogueItem docs the way an upgrading Household's pre-0.3.0 data
 * actually looks: a `defaultShopId`, `categoryId` or `shopId` field can be missing, `null`, or not
 * a valid id. A `null` `shopId` is treated the same as an absent one, matching
 * `catalogueItemShopId` in `firestore.rules`. Any other malformed field takes the whole doc out of
 * `existing` (it is reported in `skipped`) rather than aborting the backfill for every other doc.
 */
export declare function parseExistingCatalogue(shopDocs: readonly FirestoreDoc[], categoryDocs: readonly FirestoreDoc[], catalogueItemDocs: readonly FirestoreDoc[]): {
    existing: ExistingCatalogue;
    skipped: readonly SkippedDoc[];
};
export {};
