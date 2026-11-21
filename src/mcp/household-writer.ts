import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from "firebase/firestore";
import { ITEMS_COLLECTION, itemSchema, type ItemId } from "../core/item.ts";
import { stateSchema } from "../core/state.ts";
import { stateHistoryCollectionPath } from "../core/state-history.ts";

/** Raised when a write is refused before it is sent: an invalid State, or no live Item to write to. */
export class SetItemStateError extends Error {}

/**
 * Sets one live Item's State and appends the State history entry in the same batch, as the
 * Catalogue app does. The new State and the Item it lands on are validated by data-platform's zod
 * schemas before anything is sent; `firestore.rules` then checks the write as the signed-in
 * Member, so a non-Member's write rejects with Firestore's `permission-denied`.
 */
export async function setItemState(db: Firestore, id: ItemId, state: string): Promise<void> {
  const parsedState = stateSchema.safeParse(state);
  if (!parsedState.success) {
    throw new SetItemStateError(`Not a State: ${JSON.stringify(state)}`);
  }
  const itemRef = doc(db, ITEMS_COLLECTION, id);
  const snapshot = await getDoc(itemRef);
  const data = snapshot.data();
  if (data === undefined || data.deletedAt !== undefined) {
    throw new SetItemStateError(`No live Item with id ${JSON.stringify(id)}`);
  }
  const updated = itemSchema.safeParse({ ...data, state: parsedState.data });
  if (!updated.success) {
    throw new SetItemStateError(
      `Item ${JSON.stringify(id)} would be invalid: ${updated.error.message}`,
    );
  }
  const batch = writeBatch(db);
  batch.update(itemRef, { state: parsedState.data });
  batch.set(doc(db, stateHistoryCollectionPath(id), crypto.randomUUID()), {
    state: parsedState.data,
    at: serverTimestamp(),
  });
  await batch.commit();
}
