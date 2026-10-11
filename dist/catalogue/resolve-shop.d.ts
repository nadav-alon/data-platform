import type { CatalogueItem } from "./catalogue-item.ts";
import type { Category } from "./category.ts";
import type { ShopId } from "./shop.ts";
/**
 * The Shop a CatalogueItem is bought at: its own override if set, else the Category's default.
 *
 * The caller must pass the Category whose id is `catalogueItem.categoryId`. Category carries no
 * id field of its own (the id is the doc key), so a mismatched Category is accepted silently.
 */
export declare function resolveShop(catalogueItem: CatalogueItem, category: Category): ShopId;
