import { type FirebaseWebConfig } from "./web-config.ts";
/**
 * The one localStorage key the web config lives under. Every app on the platform is served from the
 * same origin, so the key is the platform's, not any app's.
 */
export declare const FIREBASE_CONFIG_STORAGE_KEY = "data-platform:firebase-config";
/** The slice of `Storage` the config needs; `localStorage` satisfies it. */
export type ConfigStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
/** The stored config, or `null` if none is stored or the stored value is not a valid config. Never throws on a bad value. */
export declare function getStoredFirebaseWebConfig(storage?: ConfigStorage): FirebaseWebConfig | null;
export declare function saveFirebaseWebConfig(config: FirebaseWebConfig, storage?: ConfigStorage): void;
export declare function clearFirebaseWebConfig(storage?: ConfigStorage): void;
