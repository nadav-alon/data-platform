import { test } from "node:test";
import assert from "node:assert/strict";
import {
  firebaseWebConfig,
  InvalidFirebaseWebConfigError,
  isFirebaseWebConfig,
} from "./web-config.ts";

const validConfig = {
  apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl012-MnO",
  authDomain: "household.firebaseapp.com",
  projectId: "household",
  storageBucket: "household.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

test("firebaseWebConfig returns a config with every required field", () => {
  assert.deepEqual(firebaseWebConfig(validConfig), validConfig);
  assert.equal(isFirebaseWebConfig(validConfig), true);
});

test("firebaseWebConfig throws naming the missing and empty fields", () => {
  assert.throws(
    () => firebaseWebConfig({ ...validConfig, appId: "", projectId: undefined }),
    (error: Error) =>
      error instanceof InvalidFirebaseWebConfigError && /projectId, appId$/.test(error.message),
  );
  assert.equal(isFirebaseWebConfig(null), false);
  assert.equal(isFirebaseWebConfig("config"), false);
});
