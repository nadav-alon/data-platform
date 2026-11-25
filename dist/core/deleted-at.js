import { firestoreTimestampSchema } from "./timestamp.js";
/**
 * When a record was soft-deleted: must be the server's own commit time (`serverTimestamp()`);
 * `firestore.rules` refuses anything else. A record without it is live; clearing it restores the
 * record.
 */
export const deletedAtSchema = firestoreTimestampSchema.optional();
/** Whether a stored document is live: it has no `deletedAt`. */
export function isLive(data) {
    return data.deletedAt === undefined;
}
