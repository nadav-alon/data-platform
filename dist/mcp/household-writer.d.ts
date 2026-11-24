import { type Firestore } from "firebase/firestore";
import { type ItemId } from "../core/item.ts";
import type { State } from "../core/state.ts";
/** Raised when a write is refused before it is sent: no live Item to write to, or an invalid Item. */
export declare class SetItemStateError extends Error {
}
/**
 * Sets one live Item's State and appends the State history entry in the same batch, as the
 * Catalogue app does. The merged Item is validated by data-platform's zod schema before anything
 * is sent; `state` is already parsed by the caller at its edge. The State history entry is
 * checked only by `firestore.rules`, not by `stateHistoryEntrySchema`, which does not accept the
 * `serverTimestamp()` placeholder. The rules check the write as the signed-in Member, so a
 * non-Member's write rejects with Firestore's `permission-denied`.
 */
export declare function setItemState(db: Firestore, id: ItemId, state: State): Promise<void>;
