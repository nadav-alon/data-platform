import { test } from "node:test";
import assert from "node:assert/strict";
import { emulatorConfig, launchLocal, parseScenario } from "./launch.ts";

test("the emulator config loads the given rules into Firestore and runs Auth beside it", () => {
  const config = emulatorConfig("/x/firestore.rules");
  assert.equal(config.firestore.rules, "/x/firestore.rules");
  assert.ok(config.emulators.auth.port);
  assert.ok(config.emulators.firestore.port);
});

test("no scenario argument selects empty; a name selects that scenario", () => {
  assert.equal(parseScenario([]), "empty");
  assert.equal(parseScenario(["owner-with-items"]), "owner-with-items");
});

test("an unknown scenario fails listing the known ones, before any emulator starts", async () => {
  await assert.rejects(launchLocal(["nope"]), /known scenarios: empty, owner-with-items, invited-member/);
});
