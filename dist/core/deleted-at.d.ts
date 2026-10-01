/**
 * When a record was soft-deleted: must be the server's own commit time (`serverTimestamp()`);
 * `firestore.rules` refuses anything else. A record without it is live; clearing it restores the
 * record.
 */
export declare const deletedAtSchema: import("zod").ZodOptional<import("zod").ZodCustom<import("./timestamp.ts").FirestoreTimestamp, import("./timestamp.ts").FirestoreTimestamp>>;
