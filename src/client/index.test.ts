import assert from "node:assert/strict";
import { test } from "node:test";
import { FirebaseError } from "firebase/app";
import { isRulesRefusal } from "./index.ts";

test("data-platform/client exports isRulesRefusal", () => {
  assert.equal(isRulesRefusal(new FirebaseError("permission-denied", "denied")), true);
});
