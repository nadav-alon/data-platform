import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIO_NAMES, SCENARIOS, scenarioName, seedScenario, type Scenario } from "./scenarios.ts";
import type { FixtureWriter } from "./seed.ts";

const nullWriter: FixtureWriter = { async set() {} };

test("the known scenarios include empty, owner-with-items and invited-member", () => {
  for (const name of ["empty", "owner-with-items", "invited-member"]) {
    assert.ok(SCENARIO_NAMES.includes(name as never), name);
  }
});

test("every scenario's fixtures pass their collection schemas", async () => {
  for (const name of SCENARIO_NAMES) {
    await seedScenario(nullWriter, name);
  }
});

test("an unknown scenario name fails listing the known ones", async () => {
  assert.throws(() => scenarioName("nope"), (error: Error) => {
    assert.match(error.message, /"nope"/);
    for (const name of SCENARIO_NAMES) assert.match(error.message, new RegExp(name));
    return true;
  });
  await assert.rejects(seedScenario(nullWriter, "toString"), /known scenarios/);
});

test("a scenario's users are each a Member doc, and the Owner is the household's owner", () => {
  for (const name of SCENARIO_NAMES) {
    const { users, fixtures }: Scenario = SCENARIOS[name];
    for (const user of users) {
      assert.ok(
        fixtures.some((f) => f.collection === "members" && f.id === user.uid),
        `${name}: ${user.email} has a members doc`,
      );
      const household = fixtures.find((f) => f.collection === "meta" && f.id === "household");
      assert.equal(household?.data.owner === user.uid, user.role === "owner");
    }
  }
});
