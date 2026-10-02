declare const firestoreLocationBrand: unique symbol;

/** A Firestore location id, as passed to `firebase firestore:databases:create --location`. */
export type FirestoreLocation = string & { readonly [firestoreLocationBrand]: true };

/** Multi-region ids (`nam5`, `eur3`) and regions (`europe-west1`, `us-central1`). */
const FIRESTORE_LOCATION_PATTERN = /^[a-z]+(?:[a-z0-9]*|-[a-z]+[0-9]+)$/;

export function isFirestoreLocation(value: string): value is FirestoreLocation {
  return FIRESTORE_LOCATION_PATTERN.test(value);
}

export function firestoreLocation(value: string): FirestoreLocation {
  if (!isFirestoreLocation(value)) {
    throw new Error(`Not a Firestore location (e.g. nam5, eur3, europe-west1): ${value}`);
  }
  return value;
}
