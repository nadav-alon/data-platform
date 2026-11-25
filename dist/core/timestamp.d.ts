import { z } from "zod";
/**
 * The shape the Firestore SDK returns for a timestamp field. Structural rather than an
 * `instanceof` check on the SDK's `Timestamp` class, since this package doesn't depend on
 * the Firebase SDK. `z.custom` rather than `z.object` on purpose: an SDK `Timestamp` instance
 * passed through this schema stays an instance, keeping `toDate()`/`toMillis()`, instead of
 * being copied into a plain object.
 */
export interface FirestoreTimestamp {
    readonly seconds: number;
    readonly nanoseconds: number;
}
export declare const firestoreTimestampSchema: z.ZodCustom<FirestoreTimestamp, FirestoreTimestamp>;
