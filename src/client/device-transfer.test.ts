import { test } from "node:test";
import assert from "node:assert/strict";
import { deviceTransferUrl, parseConfigFragment } from "./device-transfer.ts";
import { firebaseWebConfig, InvalidFirebaseWebConfigError } from "./web-config.ts";

const config = firebaseWebConfig({
  apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl012-MnO",
  authDomain: "household.firebaseapp.com",
  projectId: "household",
  storageBucket: "household.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
});

const hashOf = (url: string) => url.slice(url.indexOf("#"));

test("a transfer link decodes back to the source config", () => {
  const url = deviceTransferUrl("https://owner.github.io/recipes/", config);
  assert.deepEqual(parseConfigFragment(hashOf(url)), config);
});

test("a transfer link keeps the page URL and replaces any prior fragment", () => {
  const url = deviceTransferUrl("https://owner.github.io/recipes/?a=1#stale", config);
  assert.match(url, /^https:\/\/owner\.github\.io\/recipes\/\?a=1#config=[\w-]+$/);
});

test("a config with non-ASCII text survives the round trip", () => {
  const unicode = firebaseWebConfig({ ...config, projectId: "בית-☃" });
  const url = deviceTransferUrl("https://owner.github.io/", unicode);
  assert.deepEqual(parseConfigFragment(hashOf(url)), unicode);
});

test("a hash without a config fragment reads as absent", () => {
  assert.equal(parseConfigFragment(""), null);
  assert.equal(parseConfigFragment("#other=1"), null);
});

test("a truncated or non-JSON fragment throws", () => {
  const truncated = hashOf(deviceTransferUrl("https://owner.github.io/", config)).slice(0, -10);
  for (const hash of [truncated, "#config=not-base64!!!"]) {
    assert.throws(
      () => parseConfigFragment(hash),
      (error: Error) =>
        error instanceof InvalidFirebaseWebConfigError && /truncated or corrupted/.test(error.message),
    );
  }
});

test("a fragment that decodes to an incomplete config throws", () => {
  const payload = Buffer.from(JSON.stringify({ apiKey: "only-this-field" })).toString("base64url");
  assert.throws(() => parseConfigFragment(`#config=${payload}`), /missing or has empty fields/);
});
