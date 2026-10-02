import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIO_NAMES, SCENARIOS, scenarioName, seedScenario, type Scenario } from "./scenarios.ts";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION } from "../core/platform.ts";
import type { Fixture, FixtureWriter } from "./seed.ts";
import { computeReferenceCounts } from "../catalogue/reference-count-backfill.ts";
import { categoryId, type CategoryId } from "../catalogue/category.ts";
import { shopId, type ShopId } from "../catalogue/shop.ts";

const nullWriter: FixtureWriter = { async set() {} };

/** A writer that records every doc it is given, keyed by path. */
function recordingWriter(): { writer: FixtureWriter; written: Map<string, Record<string, unknown>> } {
  const written = new Map<string, Record<string, unknown>>();
  return { writer: { async set(path, data) { written.set(path, data); } }, written };
}

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
  assert.throws(() => scenarioName("toString"), /known scenarios/);
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

for (const name of SCENARIO_NAMES) {
  test(`${name} seeds meta/platform with this release's PLATFORM_VERSION`, async () => {
    const { writer, written } = recordingWriter();
    await seedScenario(writer, name);
    assert.deepEqual(written.get(PLATFORM_DOC_PATH), { version: PLATFORM_VERSION });
  });
}

/**
 * One message per seeded Shop or Category whose `referenceCount` differs from what
 * `computeReferenceCounts` derives from the same fixtures; empty when every count is true.
 */
function referenceCountMismatches(name: string, fixtures: readonly Fixture[]): string[] {
  const docsIn = (collection: string) => fixtures.filter((f) => f.collection === collection);
  const counts = computeReferenceCounts({
    shopIds: docsIn("shops").map((f) => shopId(f.id)),
    categories: new Map<CategoryId, { defaultShopId: ShopId }>(
      docsIn("categories").map((f) => [
        categoryId(f.id),
        { defaultShopId: shopId(String(f.data.defaultShopId)) },
      ]),
    ),
    catalogueItems: docsIn("catalogueItems").map((f) => ({
      categoryId: categoryId(String(f.data.categoryId)),
      shopId: f.data.shopId == null ? undefined : shopId(String(f.data.shopId)),
    })),
  });

  const mismatches: string[] = [];
  for (const f of docsIn("shops")) {
    const expected = counts.shops.get(shopId(f.id));
    if (f.data.referenceCount !== expected) {
      mismatches.push(`${name}: shops/${f.id} seeds referenceCount ${f.data.referenceCount}, but ${expected} reference it`);
    }
  }
  for (const f of docsIn("categories")) {
    const expected = counts.categories.get(categoryId(f.id));
    if (f.data.referenceCount !== expected) {
      mismatches.push(`${name}: categories/${f.id} seeds referenceCount ${f.data.referenceCount}, but ${expected} reference it`);
    }
  }
  return mismatches;
}

for (const name of SCENARIO_NAMES) {
  test(`${name} seeds every Shop's and Category's referenceCount as its true count`, () => {
    assert.deepEqual(referenceCountMismatches(name, SCENARIOS[name].fixtures), []);
  });
}

test("a referenceCount off by one fails naming the scenario, the doc and both counts", () => {
  const fixtures = SCENARIOS["owner-with-items"].fixtures.map((f) =>
    f.collection === "categories" && f.id === "cleaning"
      ? { ...f, data: { ...f.data, referenceCount: 2 } }
      : f,
  );
  assert.deepEqual(referenceCountMismatches("owner-with-items", fixtures), [
    "owner-with-items: categories/cleaning seeds referenceCount 2, but 1 reference it",
  ]);
});
