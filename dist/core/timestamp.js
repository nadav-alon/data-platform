import { z } from "zod";
export const firestoreTimestampSchema = z.custom((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const { seconds, nanoseconds } = value;
    return (typeof seconds === "number" &&
        Number.isInteger(seconds) &&
        typeof nanoseconds === "number" &&
        Number.isInteger(nanoseconds) &&
        nanoseconds >= 0 &&
        nanoseconds < 1_000_000_000);
}, { message: "Expected a Firestore Timestamp" });
