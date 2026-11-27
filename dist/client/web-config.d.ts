import type { FirebaseOptions } from "firebase/app";
import { z } from "zod";
declare const firebaseWebConfigSchema: z.core.$ZodBranded<z.ZodObject<{
    apiKey: z.ZodString;
    authDomain: z.ZodString;
    projectId: z.ZodString;
    storageBucket: z.ZodString;
    messagingSenderId: z.ZodString;
    appId: z.ZodString;
}, z.core.$loose>, "FirebaseWebConfig", "out">;
/** A Firebase web config that has passed {@link isFirebaseWebConfig}. */
export type FirebaseWebConfig = z.infer<typeof firebaseWebConfigSchema> & FirebaseOptions;
/** Thrown when a value that should be a Firebase web config is not one. */
export declare class InvalidFirebaseWebConfigError extends Error {
}
/** The guard: an object with every required field a non-empty string. */
export declare function isFirebaseWebConfig(value: unknown): value is FirebaseWebConfig;
/**
 * The constructor: narrows, or throws {@link InvalidFirebaseWebConfigError} naming the missing
 * fields. Unlike the other brands' constructors it does not name the offending value: that would put
 * the `apiKey` into error messages and logs.
 */
export declare function firebaseWebConfig(value: unknown): FirebaseWebConfig;
export {};
