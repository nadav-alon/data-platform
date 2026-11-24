import { firebaseWebConfig } from "./web-config.js";
/**
 * The one localStorage key the web config lives under. Every app on the platform is served from the
 * same origin, so the key is the platform's, not any app's.
 */
export const FIREBASE_CONFIG_STORAGE_KEY = "data-platform:firebase-config";
/** The stored config, or `null` if none is stored or the stored value is not a valid config. Never throws on a bad value or on storage that cannot be read. */
export function getStoredFirebaseWebConfig(storage) {
    try {
        // The default is resolved here, not as a default parameter: a parameter default runs outside this
        // `try`, so a missing or throwing `localStorage` would crash instead of reading as absent.
        const store = storage ?? localStorage;
        const raw = store.getItem(FIREBASE_CONFIG_STORAGE_KEY);
        if (raw === null)
            return null;
        return firebaseWebConfig(JSON.parse(raw));
    }
    catch {
        return null;
    }
}
export function saveFirebaseWebConfig(config, storage = localStorage) {
    storage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
}
export function clearFirebaseWebConfig(storage = localStorage) {
    storage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
}
