import { test } from "node:test";
import assert from "node:assert/strict";
import * as dataPlatform from "./index.ts";

test("re-exports the core and catalogue modules", () => {
  assert.equal(typeof dataPlatform.core, "object");
  assert.equal(typeof dataPlatform.catalogue, "object");
});
