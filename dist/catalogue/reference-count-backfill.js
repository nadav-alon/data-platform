import { CATALOGUE_ITEMS_COLLECTION } from "./catalogue-item.js";
import { CATEGORIES_COLLECTION, categoryId, categoryIdSchema } from "./category.js";
import { shopId, shopIdSchema } from "./shop.js";
/**
 * Every existing Shop and Category's referenceCount, recomputed from what currently references
 * it rather than trusted from the document itself — safe to run more than once. A `defaultShopId`
 * or `categoryId`/`shopId` naming a doc outside `existing` is not counted: that reference is
 * already broken, and backfilling can't repair it. A soft-deleted Category or CatalogueItem holds
 * no reference, so it adds to no count (a Category still gets a count of its own).
 */
export function computeReferenceCounts(existing) {
    const shops = new Map(existing.shopIds.map((id) => [id, 0]));
    const categories = new Map(Array.from(existing.categories.keys()).map((id) => [id, 0]));
    const increment = (map, id) => {
        const count = map.get(id);
        if (count !== undefined) {
            map.set(id, count + 1);
        }
    };
    for (const category of existing.categories.values()) {
        if (category.softDeleted)
            continue;
        increment(shops, category.defaultShopId);
    }
    for (const catalogueItem of existing.catalogueItems) {
        if (catalogueItem.softDeleted)
            continue;
        increment(categories, catalogueItem.categoryId);
        if (catalogueItem.shopId !== undefined) {
            increment(shops, catalogueItem.shopId);
        }
    }
    return { shops, categories };
}
/** A `null` `deletedAt` counts as live, matching `deletedAtOf` in `firestore.rules`. */
function softDeletedFlag(doc) {
    return doc.data.deletedAt == null ? {} : { softDeleted: true };
}
/**
 * Reads Shop, Category and CatalogueItem docs the way an upgrading Household's pre-0.3.0 data
 * actually looks: a `defaultShopId`, `categoryId` or `shopId` field can be missing, `null`, or not
 * a valid id. A `null` `shopId` is treated the same as an absent one, matching
 * `catalogueItemShopId` in `firestore.rules`. Any other malformed field takes the whole doc out of
 * `existing` (it is reported in `skipped`) rather than aborting the backfill for every other doc.
 */
export function parseExistingCatalogue(shopDocs, categoryDocs, catalogueItemDocs) {
    const skipped = [];
    const shopIds = shopDocs.map((doc) => shopId(doc.id));
    const categories = new Map();
    for (const doc of categoryDocs) {
        const defaultShopId = shopIdSchema.safeParse(doc.data.defaultShopId);
        if (!defaultShopId.success) {
            skipped.push({
                collection: CATEGORIES_COLLECTION,
                id: doc.id,
                reason: `invalid defaultShopId ${JSON.stringify(doc.data.defaultShopId)}`,
            });
            continue;
        }
        categories.set(categoryId(doc.id), { defaultShopId: defaultShopId.data, ...softDeletedFlag(doc) });
    }
    const catalogueItems = [];
    for (const doc of catalogueItemDocs) {
        const parsedCategoryId = categoryIdSchema.safeParse(doc.data.categoryId);
        if (!parsedCategoryId.success) {
            skipped.push({
                collection: CATALOGUE_ITEMS_COLLECTION,
                id: doc.id,
                reason: `invalid categoryId ${JSON.stringify(doc.data.categoryId)}`,
            });
            continue;
        }
        const rawShopId = doc.data.shopId;
        let parsedShopId;
        if (rawShopId != null) {
            const result = shopIdSchema.safeParse(rawShopId);
            if (!result.success) {
                skipped.push({
                    collection: CATALOGUE_ITEMS_COLLECTION,
                    id: doc.id,
                    reason: `invalid shopId ${JSON.stringify(rawShopId)}`,
                });
                continue;
            }
            parsedShopId = result.data;
        }
        catalogueItems.push({ categoryId: parsedCategoryId.data, shopId: parsedShopId, ...softDeletedFlag(doc) });
    }
    return { existing: { shopIds, categories, catalogueItems }, skipped };
}
