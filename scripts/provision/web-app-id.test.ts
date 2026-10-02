import { test } from "node:test";
import assert from "node:assert/strict";
import { isWebAppId, webAppId } from "./web-app-id.ts";

test("accepts a web app id", () => {
  assert.equal(isWebAppId("1:123456789:web:0a1b2c3d"), true);
  assert.equal(webAppId("1:123456789:web:0a1b2c3d"), "1:123456789:web:0a1b2c3d");
});

test("rejects an android app id and a project id", () => {
  assert.equal(isWebAppId("1:123456789:android:0a1b2c3d"), false);
  assert.equal(isWebAppId("my-household-42"), false);
  assert.throws(() => webAppId("my-household-42"), /Not a Firebase web app id/);
});
