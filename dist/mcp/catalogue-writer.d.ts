import { type Firestore } from "firebase/firestore";
import { type CatalogueItem } from "../catalogue/catalogue-item.ts";
import { type Item, type ItemId } from "../core/item.ts";
/** What a conversation supplies to add a CatalogueItem: the Item's own fields and its catalogue data. */
export type NewCatalogueItem = Pick<Item, "name"> & Partial<Pick<Item, "state">> & Pick<CatalogueItem, "categoryId" | "necessity"> & Partial<Pick<CatalogueItem, "shopId" | "aisleId" | "tagIds">>;
/**
 * Adds a new Item and its CatalogueItem in one batch, and bumps the `referenceCount` of the
 * Category (and of the Shop override, when set) the way `firestore.rules` requires. Both documents
 * are parsed with data-platform's own schemas first; a refusal throws before anything is sent.
 * Rejects with Firestore's `permission-denied` when the signed-in user is not a Member, or when the
 * Category or Shop is missing or soft-deleted. Returns the new Item's id.
 */
export declare function addCatalogueItem(db: Firestore, input: NewCatalogueItem): Promise<ItemId>;
