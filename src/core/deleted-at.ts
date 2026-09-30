import { firestoreTimestampSchema } from "./timestamp.ts";

/**
 * When a record was soft-deleted, set by `firestore.rules` to the server's own commit time. A
 * record without it is live; clearing it restores the record.
 */
export const deletedAtSchema = firestoreTimestampSchema.optional();
