import { collection, doc, getDoc, serverTimestamp, writeBatch, } from "firebase/firestore";
import { ITEMS_COLLECTION, itemSchema } from "../core/item.js";
import { stateHistoryCollectionPath } from "../core/state-history.js";
import { isLive } from "../core/deleted-at.js";
/** Raised when a write is refused before it is sent: no live Item to write to, or an invalid Item. */
export class SetItemStateError extends Error {
}
/**
 * Sets one live Item's State and appends the State history entry in the same batch, as the
 * Catalogue app does. The merged Item is validated by data-platform's zod schema before anything
 * is sent; `state` is already parsed by the caller at its edge. The State history entry is
 * checked only by `firestore.rules`, not by `stateHistoryEntrySchema`, which does not accept the
 * `serverTimestamp()` placeholder. The rules check the write as the signed-in Member, so a
 * non-Member's write rejects with Firestore's `permission-denied`.
 */
export async function setItemState(db, id, state) {
    const itemRef = doc(db, ITEMS_COLLECTION, id);
    const snapshot = await getDoc(itemRef);
    const data = snapshot.data();
    if (data === undefined || !isLive(data)) {
        throw new SetItemStateError(`No live Item with id ${JSON.stringify(id)}`);
    }
    const updated = itemSchema.safeParse({ ...data, state });
    if (!updated.success) {
        throw new SetItemStateError(`Item ${JSON.stringify(id)} would be invalid: ${updated.error.message}`);
    }
    const batch = writeBatch(db);
    batch.update(itemRef, { state });
    batch.set(doc(collection(db, stateHistoryCollectionPath(id))), { state, at: serverTimestamp() });
    await batch.commit();
}
