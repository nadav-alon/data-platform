import type { FirebaseOptions } from "firebase/app";

declare const firebaseWebConfigBrand: unique symbol;

/** A Firebase web config that has passed {@link isFirebaseWebConfig}. */
export type FirebaseWebConfig = FirebaseOptions & { readonly [firebaseWebConfigBrand]: true };

const REQUIRED_FIELDS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const satisfies readonly (keyof FirebaseOptions)[];

/** Thrown when a value that should be a Firebase web config is not one. */
export class InvalidFirebaseWebConfigError extends Error {}

function missingFields(value: unknown): readonly string[] {
  const record =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return REQUIRED_FIELDS.filter((field) => typeof record[field] !== "string" || record[field] === "");
}

/** The guard: an object with every required field a non-empty string. */
export function isFirebaseWebConfig(value: unknown): value is FirebaseWebConfig {
  return typeof value === "object" && value !== null && missingFields(value).length === 0;
}

/** The constructor: narrows, or throws {@link InvalidFirebaseWebConfigError} naming the missing fields. */
export function firebaseWebConfig(value: unknown): FirebaseWebConfig {
  if (!isFirebaseWebConfig(value)) {
    throw new InvalidFirebaseWebConfigError(
      `Firebase config is missing or has empty fields: ${missingFields(value).join(", ")}`,
    );
  }
  return value;
}
