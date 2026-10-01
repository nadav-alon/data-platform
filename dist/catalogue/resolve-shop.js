/**
 * The Shop a CatalogueItem is bought at: its own override if set, else the Category's default.
 *
 * The caller must pass the Category whose id is `catalogueItem.categoryId`. Category carries no
 * id field of its own (the id is the doc key), so a mismatched Category is accepted silently.
 */
export function resolveShop(catalogueItem, category) {
    return catalogueItem.shopId ?? category.defaultShopId;
}
