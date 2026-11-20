import { z } from "zod";
import { type ItemId } from "./item.ts";
export declare const STATE_HISTORY_COLLECTION = "stateHistory";
/** The stateHistory subcollection under one Item, ready for `collection(db, ...)`. */
export declare function stateHistoryCollectionPath(itemId: ItemId): string;
/** The doc path for one stateHistory entry, ready for `doc(db, ...)`. */
export declare function stateHistoryEntryDocPath(itemId: ItemId, entryId: string): string;
/**
 * Append-only: entries are only ever created, never updated or deleted.
 * `at` is set by the server, and accepts either a `Date` (the shape a fresh write reads back
 * as, before the server has assigned it) or a Firestore `Timestamp` (the shape a later read
 * returns). Neither matches the `serverTimestamp()` sentinel a create actually writes, so no
 * create is a `stateHistoryEntrySchema` accept and a `firestore.rules` accept at once: the
 * rules alone enforce `at == request.time` (`firestore.rules`, `isValidStateHistoryEntry`).
 */
export declare const stateHistoryEntrySchema: z.ZodObject<{
    state: z.ZodEnum<{
        enough: "enough";
        out: "out";
        "running low": "running low";
    }>;
    at: z.ZodUnion<readonly [z.ZodDate, z.ZodCustom<import("./timestamp.ts").FirestoreTimestamp, import("./timestamp.ts").FirestoreTimestamp>]>;
}, z.core.$loose>;
export type StateHistoryEntry = z.infer<typeof stateHistoryEntrySchema>;
