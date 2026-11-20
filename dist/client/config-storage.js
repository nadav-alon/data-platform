import { firebaseWebConfig } from "./web-config.js";
/**
 * The one localStorage key the web config lives under. Every app on the platform is served from the
 * same origin, so the key is the platform's, not any app's.
 */
export const FIREBASE_CONFIG_STORAGE_KEY = "data-platform:firebase-config";
/** The stored config, or `null` if none is stored or the stored value is not a valid config. Never throws on a bad value. */
export function getStoredFirebaseWebConfig(storage = localStorage) {
    const raw = storage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw === null)
        return null;
    try {
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
