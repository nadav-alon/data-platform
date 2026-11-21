import { test } from "node:test";
import assert from "node:assert/strict";
import { isRulesRefusal } from "./index.ts";
import * as rulesRefusal from "./rules-refusal.ts";

test("data-platform/client re-exports isRulesRefusal", () => {
  assert.equal(isRulesRefusal, rulesRefusal.isRulesRefusal);
});
