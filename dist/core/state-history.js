import { z } from "zod";
import { ITEMS_COLLECTION } from "./item.js";
import { stateSchema } from "./state.js";
import { firestoreTimestampSchema } from "./timestamp.js";
export const STATE_HISTORY_COLLECTION = "stateHistory";
/** The stateHistory subcollection under one Item, ready for `collection(db, ...)`. */
export function stateHistoryCollectionPath(itemId) {
    return `${ITEMS_COLLECTION}/${itemId}/${STATE_HISTORY_COLLECTION}`;
}
/** The doc path for one stateHistory entry, ready for `doc(db, ...)`. */
export function stateHistoryEntryDocPath(itemId, entryId) {
    return `${stateHistoryCollectionPath(itemId)}/${entryId}`;
}
/**
 * Append-only: entries are only ever created, never updated or deleted.
 * `at` is set by the server, and accepts either a `Date` (the shape a fresh write reads back
 * as, before the server has assigned it) or a Firestore `Timestamp` (the shape a later read
 * returns). Neither matches the `serverTimestamp()` sentinel a create actually writes, so no
 * create is a `stateHistoryEntrySchema` accept and a `firestore.rules` accept at once: the
 * rules alone enforce `at == request.time` (`firestore.rules`, `isValidStateHistoryEntry`).
 */
export const stateHistoryEntrySchema = z.looseObject({
    state: stateSchema,
    at: z.union([z.date(), firestoreTimestampSchema]),
});
