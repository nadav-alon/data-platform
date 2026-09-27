declare const firebaseProjectIdBrand: unique symbol;

/** A Firebase project id, as passed to `firebase deploy --project`. */
export type FirebaseProjectId = string & { readonly [firebaseProjectIdBrand]: true };

/** Google Cloud project id rules: 6-30 chars, lowercase letters, digits and hyphens, no trailing hyphen. */
const FIREBASE_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export function isFirebaseProjectId(value: string): value is FirebaseProjectId {
  return FIREBASE_PROJECT_ID_PATTERN.test(value);
}

export function firebaseProjectId(value: string): FirebaseProjectId {
  if (!isFirebaseProjectId(value)) {
    throw new Error(
      `Not a Firebase project id (expected 6-30 lowercase letters, digits and hyphens): ${value}`,
    );
  }
  return value;
}
