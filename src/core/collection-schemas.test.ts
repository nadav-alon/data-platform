import { test } from "node:test";
import assert from "node:assert/strict";
import { CORE_COLLECTION_SCHEMAS } from "./collection-schemas.ts";
import { HOUSEHOLD_DOC_PATH, householdMetaSchema } from "./household.ts";
import { ITEMS_COLLECTION, itemSchema } from "./item.ts";
import { MEMBERS_COLLECTION, memberSchema } from "./members.ts";
import { PLATFORM_DOC_PATH, platformMetaSchema } from "./platform.ts";
import { STATE_HISTORY_COLLECTION, stateHistoryEntrySchema } from "./state-history.ts";

test("keys each Core collection by its own schema", () => {
  assert.equal(CORE_COLLECTION_SCHEMAS[ITEMS_COLLECTION], itemSchema);
  assert.equal(CORE_COLLECTION_SCHEMAS[MEMBERS_COLLECTION], memberSchema);
  assert.equal(CORE_COLLECTION_SCHEMAS[STATE_HISTORY_COLLECTION], stateHistoryEntrySchema);
});

test("keys meta's two singleton docs by their full doc path, not the bare collection name", () => {
  assert.equal(CORE_COLLECTION_SCHEMAS[HOUSEHOLD_DOC_PATH], householdMetaSchema);
  assert.equal(CORE_COLLECTION_SCHEMAS[PLATFORM_DOC_PATH], platformMetaSchema);
  assert.equal(CORE_COLLECTION_SCHEMAS.meta, undefined);
});
