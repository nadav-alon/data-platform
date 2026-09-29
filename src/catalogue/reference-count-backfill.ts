import type { CatalogueItem } from "./catalogue-item.ts";
import type { Category, CategoryId } from "./category.ts";
import type { ReferenceCount } from "./reference-count.ts";
import type { ShopId } from "./shop.ts";

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

  const incrementShop = (id: ShopId | undefined) => {
    const count = id === undefined ? undefined : shops.get(id);
    if (id !== undefined && count !== undefined) {
      shops.set(id, count + 1);
    }
  };
  const incrementCategory = (id: CategoryId) => {
    const count = categories.get(id);
    if (count !== undefined) {
      categories.set(id, count + 1);
    }
  };

  for (const category of existing.categories.values()) {
    incrementShop(category.defaultShopId);
  }

  for (const catalogueItem of existing.catalogueItems) {
    incrementCategory(catalogueItem.categoryId);
    incrementShop(catalogueItem.shopId);
  }

  return { shops, categories };
}
