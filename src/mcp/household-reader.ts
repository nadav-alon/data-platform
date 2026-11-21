import { collection, getDocs, type Firestore } from "firebase/firestore";
import { ITEMS_COLLECTION, itemSchema, type Item } from "../core/item.ts";

/** An Item as stored, with its document id. Soft-deleted Items are never returned. */
export type ItemRecord = Item & { readonly id: string };

/** Whether a stored document is live: it has no `deletedAt`. */
function isLive(data: Record<string, unknown>): boolean {
  return data.deletedAt === undefined;
}

/**
 * Every live Item in the Household with its State, as stored. Raw data: no grouping or derived
 * fields. Rejects with Firestore's `permission-denied` when the signed-in user is not a Member.
 */
export async function readItems(db: Firestore): Promise<ItemRecord[]> {
  const snapshot = await getDocs(collection(db, ITEMS_COLLECTION));
  return snapshot.docs
    .filter((document) => isLive(document.data()))
    .map((document) => ({ ...itemSchema.parse(document.data()), id: document.id }));
}
