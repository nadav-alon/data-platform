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

export const firestoreTimestampSchema = z.custom<FirestoreTimestamp>((value) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const { seconds, nanoseconds } = value as Record<string, unknown>;
  return (
    typeof seconds === "number" &&
    Number.isInteger(seconds) &&
    typeof nanoseconds === "number" &&
    Number.isInteger(nanoseconds) &&
    nanoseconds >= 0 &&
    nanoseconds < 1_000_000_000
  );
}, { message: "Expected a Firestore Timestamp" });
