import { CATALOGUE_ITEMS_COLLECTION, type CatalogueItem } from "./catalogue-item.ts";
import { CATEGORIES_COLLECTION, categoryId, categoryIdSchema, type Category, type CategoryId } from "./category.ts";
import type { ReferenceCount } from "./reference-count.ts";
import { shopId, shopIdSchema, type ShopId } from "./shop.ts";

/** Enough of a Household's existing Shops, Categories and CatalogueItems to recompute referenceCount. */
export type ExistingCatalogue = {
  readonly shopIds: readonly ShopId[];
  readonly categories: ReadonlyMap<CategoryId, Pick<Category, "defaultShopId">>;
  readonly catalogueItems: readonly Pick<CatalogueItem, "categoryId" | "shopId">[];
};

export type ReferenceCounts = {
  readonly shops: ReadonlyMap<ShopId, ReferenceCount>;
  readonly categories: ReadonlyMap<CategoryId, ReferenceCount>;
};

/**
 * Every existing Shop and Category's referenceCount, recomputed from what currently references
 * it rather than trusted from the document itself — safe to run more than once. A `defaultShopId`
 * or `categoryId`/`shopId` naming a doc outside `existing` is not counted: that reference is
 * already broken, and backfilling can't repair it.
 */
export function computeReferenceCounts(existing: ExistingCatalogue): ReferenceCounts {
  const shops = new Map<ShopId, ReferenceCount>(existing.shopIds.map((id) => [id, 0]));
  const categories = new Map<CategoryId, ReferenceCount>(
    Array.from(existing.categories.keys()).map((id) => [id, 0]),
  );

  const increment = <Id>(map: Map<Id, ReferenceCount>, id: Id) => {
    const count = map.get(id);
    if (count !== undefined) {
      map.set(id, count + 1);
    }
  };

  for (const category of existing.categories.values()) {
    increment(shops, category.defaultShopId);
  }

  for (const catalogueItem of existing.catalogueItems) {
    increment(categories, catalogueItem.categoryId);
    if (catalogueItem.shopId !== undefined) {
      increment(shops, catalogueItem.shopId);
    }
  }

  return { shops, categories };
}

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
export function parseExistingCatalogue(
  shopDocs: readonly FirestoreDoc[],
  categoryDocs: readonly FirestoreDoc[],
  catalogueItemDocs: readonly FirestoreDoc[],
): { existing: ExistingCatalogue; skipped: readonly SkippedDoc[] } {
  const skipped: SkippedDoc[] = [];

  const shopIds = shopDocs.map((doc) => shopId(doc.id));

  const categories = new Map<CategoryId, Pick<Category, "defaultShopId">>();
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
    categories.set(categoryId(doc.id), { defaultShopId: defaultShopId.data });
  }

  const catalogueItems: Pick<CatalogueItem, "categoryId" | "shopId">[] = [];
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
    let parsedShopId: ShopId | undefined;
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

    catalogueItems.push({ categoryId: parsedCategoryId.data, shopId: parsedShopId });
  }

  return { existing: { shopIds, categories, catalogueItems }, skipped };
}
