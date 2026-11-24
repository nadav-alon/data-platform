import { collection, doc, increment, writeBatch } from "firebase/firestore";
import { catalogueItemSchema, CATALOGUE_ITEMS_COLLECTION, } from "../catalogue/catalogue-item.js";
import { CATEGORIES_COLLECTION } from "../catalogue/category.js";
import { SHOPS_COLLECTION } from "../catalogue/shop.js";
import { ITEMS_COLLECTION, itemId, itemSchema } from "../core/item.js";
/**
 * Adds a new Item and its CatalogueItem in one batch, and bumps the `referenceCount` of the
 * Category (and of the Shop override, when set) the way `firestore.rules` requires. Both documents
 * are parsed with data-platform's own schemas first; a refusal throws before anything is sent.
 * Rejects with Firestore's `permission-denied` when the signed-in user is not a Member, or when the
 * Category or Shop is missing or soft-deleted. Returns the new Item's id.
 */
export async function addCatalogueItem(db, input) {
    const item = itemSchema.parse({ name: input.name, state: input.state ?? "enough" });
    const catalogueItem = catalogueItemSchema.parse({
        categoryId: input.categoryId,
        necessity: input.necessity,
        // Optional keys only when set: Firestore rejects an explicit `undefined` field.
        ...(input.shopId !== undefined && { shopId: input.shopId }),
        ...(input.aisleId !== undefined && { aisleId: input.aisleId }),
        ...(input.tagIds !== undefined && { tagIds: input.tagIds }),
    });
    const itemRef = doc(collection(db, ITEMS_COLLECTION));
    const id = itemId(itemRef.id);
    const batch = writeBatch(db);
    batch.set(itemRef, item);
    batch.set(doc(db, CATALOGUE_ITEMS_COLLECTION, id), catalogueItem);
    batch.update(doc(db, CATEGORIES_COLLECTION, catalogueItem.categoryId), {
        referenceCount: increment(1),
    });
    if (catalogueItem.shopId !== undefined) {
        batch.update(doc(db, SHOPS_COLLECTION, catalogueItem.shopId), { referenceCount: increment(1) });
    }
    await batch.commit();
    return id;
}
