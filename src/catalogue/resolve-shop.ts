import type { CatalogueItem } from "./catalogue-item.ts";
import type { Category } from "./category.ts";
import type { ShopId } from "./shop.ts";

/**
 * The Shop a CatalogueItem is bought at: its own override if set, else the Category's default.
 */
export function resolveShop(catalogueItem: CatalogueItem, category: Category): ShopId {
  return catalogueItem.shopId ?? category.defaultShopId;
}
