import { collection, doc, increment, writeBatch, type Firestore } from "firebase/firestore";
import {
  catalogueItemSchema,
  CATALOGUE_ITEMS_COLLECTION,
  type CatalogueItem,
} from "../catalogue/catalogue-item.ts";
import { CATEGORIES_COLLECTION } from "../catalogue/category.ts";
import { SHOPS_COLLECTION } from "../catalogue/shop.ts";
import { ITEMS_COLLECTION, itemId, itemSchema, type Item, type ItemId } from "../core/item.ts";

/** What a conversation supplies to add a CatalogueItem: the Item's own fields and its catalogue data. */
export type NewCatalogueItem = Pick<Item, "name"> &
  Partial<Pick<Item, "state">> &
  Pick<CatalogueItem, "categoryId" | "necessity"> &
  Partial<Pick<CatalogueItem, "shopId" | "aisleId" | "tagIds">>;

/**
 * Adds a new Item and its CatalogueItem in one batch, and bumps the `referenceCount` of the
 * Category (and of the Shop override, when set) the way `firestore.rules` requires. Both documents
 * are parsed with data-platform's own schemas first; a refusal throws before anything is sent.
 * Rejects with Firestore's `permission-denied` when the signed-in user is not a Member, or when the
 * Category or Shop is missing or soft-deleted. Returns the new Item's id.
 */
export async function addCatalogueItem(db: Firestore, input: NewCatalogueItem): Promise<ItemId> {
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
