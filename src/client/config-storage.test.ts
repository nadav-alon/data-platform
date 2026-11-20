import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearFirebaseConfig,
  FIREBASE_CONFIG_STORAGE_KEY,
  getStoredFirebaseConfig,
  saveFirebaseConfig,
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
  assert.equal(getStoredFirebaseConfig(storage), null);
});

test("a saved config loads back, under a key not named after any app", () => {
  const { items, storage } = memoryStorage();
  saveFirebaseConfig(config, storage);
  assert.deepEqual(getStoredFirebaseConfig(storage), config);
  assert.deepEqual([...items.keys()], [FIREBASE_CONFIG_STORAGE_KEY]);
  assert.doesNotMatch(FIREBASE_CONFIG_STORAGE_KEY, /home-catalogue|recipes/);
});

test("a cleared config reads as absent", () => {
  const { storage } = memoryStorage();
  saveFirebaseConfig(config, storage);
  clearFirebaseConfig(storage);
  assert.equal(getStoredFirebaseConfig(storage), null);
});

test("a malformed stored value reads as absent and never throws", () => {
  for (const raw of ["{not json", '{"apiKey": "only-this-field"}', "null", '"text"']) {
    const { items, storage } = memoryStorage();
    items.set(FIREBASE_CONFIG_STORAGE_KEY, raw);
    assert.equal(getStoredFirebaseConfig(storage), null, raw);
  }
});
