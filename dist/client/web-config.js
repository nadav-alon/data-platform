import { z } from "zod";
const requiredString = z.string().min(1);
// Loose, so optional keys the console emits (`measurementId`, …) survive a round trip.
const firebaseWebConfigSchema = z
    .looseObject({
    apiKey: requiredString,
    authDomain: requiredString,
    projectId: requiredString,
    storageBucket: requiredString,
    messagingSenderId: requiredString,
    appId: requiredString,
})
    .brand();
/** Thrown when a value that should be a Firebase web config is not one. */
export class InvalidFirebaseWebConfigError extends Error {
}
/** The guard: an object with every required field a non-empty string. */
export function isFirebaseWebConfig(value) {
    return firebaseWebConfigSchema.safeParse(value).success;
}
/**
 * The constructor: narrows, or throws {@link InvalidFirebaseWebConfigError} naming the missing
 * fields. Unlike the other brands' constructors it does not name the offending value: that would put
 * the `apiKey` into error messages and logs.
 */
export function firebaseWebConfig(value) {
    const result = firebaseWebConfigSchema.safeParse(value);
    if (!result.success) {
        const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
        throw new InvalidFirebaseWebConfigError(fields.includes("")
            ? "Firebase config is not an object"
            : `Firebase config is missing or has empty fields: ${fields.join(", ")}`);
    }
    return result.data;
}
