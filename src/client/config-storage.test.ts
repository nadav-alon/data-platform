import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearFirebaseWebConfig,
  FIREBASE_CONFIG_STORAGE_KEY,
  getStoredFirebaseWebConfig,
  saveFirebaseWebConfig,
  type ConfigStorage,
} from "./config-storage.ts";
import { firebaseWebConfig } from "./web-config.ts";

const config = firebaseWebConfig({
  apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl012-MnO",
  authDomain: "household.firebaseapp.com",
  projectId: "household",
  storageBucket: "household.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
});

function memoryStorage() {
  const items = new Map<string, string>();
  const storage: ConfigStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
  return { items, storage };
}

test("the stored config is absent until one is saved", () => {
  const { storage } = memoryStorage();
  assert.equal(getStoredFirebaseWebConfig(storage), null);
});

test("a saved config loads back, under a key not named after any app", () => {
  const { items, storage } = memoryStorage();
  saveFirebaseWebConfig(config, storage);
  assert.deepEqual(getStoredFirebaseWebConfig(storage), config);
  assert.deepEqual([...items.keys()], [FIREBASE_CONFIG_STORAGE_KEY]);
  assert.doesNotMatch(FIREBASE_CONFIG_STORAGE_KEY, /home-catalogue|recipes/);
});

test("a cleared config reads as absent", () => {
  const { storage } = memoryStorage();
  saveFirebaseWebConfig(config, storage);
  clearFirebaseWebConfig(storage);
  assert.equal(getStoredFirebaseWebConfig(storage), null);
});

test("a malformed stored value reads as absent and never throws", () => {
  for (const raw of ["{not json", '{"apiKey": "only-this-field"}', "null", '"text"']) {
    const { items, storage } = memoryStorage();
    items.set(FIREBASE_CONFIG_STORAGE_KEY, raw);
    assert.equal(getStoredFirebaseWebConfig(storage), null, raw);
  }
});

const blockedError = () => new DOMException("blocked", "SecurityError");

/** Run `body` with the global `localStorage` replaced by `descriptor` (or removed), then restore it. */
function withGlobalLocalStorage(
  descriptor: PropertyDescriptor | undefined,
  body: () => void,
): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Reflect.deleteProperty(globalThis, "localStorage");
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    body();
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
    if (original) Object.defineProperty(globalThis, "localStorage", original);
  }
}

test("a storage whose getItem throws reads as absent and never throws", () => {
  const storage = {
    getItem: () => {
      throw blockedError();
    },
    setItem: () => {},
    removeItem: () => {},
  };
  assert.equal(getStoredFirebaseWebConfig(storage), null);
});

test("with no storage argument, an undefined global localStorage reads as absent", () => {
  withGlobalLocalStorage(undefined, () => {
    assert.equal(getStoredFirebaseWebConfig(), null);
  });
});

test("with no storage argument, a global localStorage that throws on access reads as absent", () => {
  withGlobalLocalStorage(
    {
      configurable: true,
      get() {
        throw blockedError();
      },
    },
    () => {
      assert.equal(getStoredFirebaseWebConfig(), null);
    },
  );
});
