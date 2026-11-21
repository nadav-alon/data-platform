import { test } from "node:test";
import assert from "node:assert/strict";
import { connectLocal } from "./connect-local.ts";
import { initLocalAuth } from "./init-local-auth.ts";
import { localKit } from "./local-kit.ts";

test("localKit is this package's connectLocal and initLocalAuth", () => {
  assert.deepEqual(Object.keys(localKit).sort(), ["connectLocal", "initLocalAuth"]);
  assert.equal(localKit.connectLocal, connectLocal);
  assert.equal(localKit.initLocalAuth, initLocalAuth);
});
