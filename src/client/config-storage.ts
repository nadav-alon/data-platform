import { firebaseWebConfig, type FirebaseWebConfig } from "./web-config.ts";

/**
 * The one localStorage key the web config lives under. Every app on the platform is served from the
 * same origin, so the key is the platform's, not any app's.
 */
export const FIREBASE_CONFIG_STORAGE_KEY = "data-platform:firebase-config";

/** The slice of `Storage` the config needs; `localStorage` satisfies it. */
export type ConfigStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The stored config, or `null` if none is stored or the stored value is not a valid config. Never throws on a bad value or on storage that cannot be read. */
export function getStoredFirebaseWebConfig(
  storage?: ConfigStorage,
): FirebaseWebConfig | null {
  try {
    storage ??= localStorage;
    const raw = storage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw === null) return null;
    return firebaseWebConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveFirebaseWebConfig(
  config: FirebaseWebConfig,
  storage: ConfigStorage = localStorage,
): void {
  storage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function clearFirebaseWebConfig(storage: ConfigStorage = localStorage): void {
  storage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
}
