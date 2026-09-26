import { z } from "zod";

/**
 * The shape the Firestore SDK returns for a timestamp field. Structural rather than an
 * `instanceof` check on the SDK's `Timestamp` class, since this package doesn't depend on
 * the Firebase SDK.
 */
export interface FirestoreTimestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
}

export const firestoreTimestampSchema = z.custom<FirestoreTimestamp>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).seconds === "number" &&
    typeof (value as Record<string, unknown>).nanoseconds === "number",
  { message: "Expected a Firestore Timestamp" },
);
