import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIO_NAMES, SCENARIOS, scenarioName, seedScenario, type Scenario, type ScenarioName } from "./scenarios.ts";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION } from "../core/platform.ts";
import type { Fixture, FixtureWriter } from "./seed.ts";
import { computeReferenceCounts, parseExistingCatalogue } from "../catalogue/reference-count-backfill.ts";
import { CATALOGUE_ITEMS_COLLECTION } from "../catalogue/catalogue-item.ts";
import { CATEGORIES_COLLECTION, categoryId } from "../catalogue/category.ts";
import { SHOPS_COLLECTION, shopId } from "../catalogue/shop.ts";
import { stateSchema } from "../core/state.ts";
import { recipeSchema, type Ingredient } from "../recipes/recipe.ts";
import { foodSchema } from "../nutrition/food.ts";
import { logEntrySchema } from "../nutrition/log-entry.ts";

const nullWriter: FixtureWriter = { async set() {} };

/** A writer that records every doc it is given, keyed by path. */
function recordingWriter(): { writer: FixtureWriter; written: Map<string, Record<string, unknown>> } {
  const written = new Map<string, Record<string, unknown>>();
  return { writer: { async set(path, data) { written.set(path, data); } }, written };
}

test("the known scenarios include empty, owner-with-items, invited-member, owner-with-recipes and owner-with-foods", () => {
  for (const name of ["empty", "owner-with-items", "invited-member", "owner-with-recipes", "owner-with-foods"]) {
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

test("every Item a scenario seeds has its catalogueItems doc", () => {
  for (const name of SCENARIO_NAMES) {
    const { fixtures }: Scenario = SCENARIOS[name];
    for (const item of fixtures.filter((f) => f.collection === "items")) {
      assert.ok(
        fixtures.some((f) => f.collection === "catalogueItems" && f.id === item.id),
        `${name}: item ${item.id} has a catalogueItems doc`,
      );
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
function referenceCountMismatches(name: ScenarioName, fixtures: readonly Fixture[]): string[] {
  const docsIn = (collection: string) => fixtures.filter((f) => f.collection === collection);
  const { existing, skipped } = parseExistingCatalogue(
    docsIn(SHOPS_COLLECTION),
    docsIn(CATEGORIES_COLLECTION),
    docsIn(CATALOGUE_ITEMS_COLLECTION),
  );
  assert.deepEqual(skipped, [], `${name}: fixtures the backfill could not read`);
  const counts = computeReferenceCounts(existing);

  const mismatchesIn = <Id>(collection: string, toId: (id: string) => Id, expectedCounts: ReadonlyMap<Id, number>) =>
    docsIn(collection).flatMap((f) => {
      const expected = expectedCounts.get(toId(f.id));
      return f.data.referenceCount === expected
        ? []
        : [`${name}: ${collection}/${f.id} seeds referenceCount ${f.data.referenceCount}, but ${expected} reference it`];
    });

  return [
    ...mismatchesIn(SHOPS_COLLECTION, shopId, counts.shops),
    ...mismatchesIn(CATEGORIES_COLLECTION, categoryId, counts.categories),
  ];
}

for (const name of SCENARIO_NAMES) {
  test(`${name} seeds every Shop's and Category's referenceCount as its true count`, () => {
    assert.deepEqual(referenceCountMismatches(name, SCENARIOS[name].fixtures), []);
  });
}

test("owner-with-items has Shops and Categories whose referenceCount the guard checks", () => {
  const { fixtures } = SCENARIOS["owner-with-items"];
  for (const collection of [SHOPS_COLLECTION, CATEGORIES_COLLECTION]) {
    assert.ok(fixtures.some((f) => f.collection === collection), collection);
  }
});

for (const collection of [SHOPS_COLLECTION, CATEGORIES_COLLECTION]) {
  for (const delta of [1, -1]) {
    test(`a ${collection} referenceCount off by ${delta > 0 ? "+1" : "-1"} fails naming the scenario, the doc and both counts`, () => {
      const name: ScenarioName = "owner-with-items";
      const target = SCENARIOS[name].fixtures.find((f) => f.collection === collection);
      assert.ok(target);
      const seeded = (target.data as { referenceCount: number }).referenceCount;
      const fixtures = SCENARIOS[name].fixtures.map((f) =>
        f === target ? { ...f, data: { ...f.data, referenceCount: seeded + delta } } : f,
      );
      assert.deepEqual(referenceCountMismatches(name, fixtures), [
        `${name}: ${collection}/${target.id} seeds referenceCount ${seeded + delta}, but ${seeded} reference it`,
      ]);
    });
  }
}

/** Every Recipe a scenario seeds, parsed against `recipeSchema`, soft-deleted ones included. */
const recipesOf = (scenario: Scenario) =>
  scenario.fixtures.filter((f) => f.collection === "recipes").map((f) => recipeSchema.parse(f.data));

test("owner-with-recipes covers every State, a soft-deleted Item and every Recipe case", () => {
  const fixtures: readonly Fixture[] = SCENARIOS["owner-with-recipes"].fixtures;
  const items = fixtures.filter((f) => f.collection === "items");
  for (const state of stateSchema.options) {
    assert.ok(items.some((i) => i.data.state === state && !i.data.deletedAt), state);
  }
  const deleted = items.filter((i) => i.data.deletedAt);
  assert.equal(deleted.length, 1);

  const recipes = recipesOf(SCENARIOS["owner-with-recipes"])
    .filter((r) => r.deletedAt === undefined)
    .map((r) => r.ingredients);
  const live = items.filter((i) => !i.data.deletedAt);
  const stateOf = (ing: Ingredient) => live.find((i) => i.id === ing.itemId)?.data.state;
  const missing = (r: Ingredient[]) => r.filter((i) => stateOf(i) === "out").length;

  assert.ok(recipes.some((r) => r.every((i) => stateOf(i) === "enough")), "makeable");
  assert.ok(recipes.some((r) => missing(r) === 1), "one Missing");
  assert.ok(recipes.some((r) => missing(r) === 2), "two Missing");
  assert.ok(recipes.some((r) => r.some((i) => !i.itemId && !i.assumed)), "unlinked");
  assert.ok(recipes.some((r) => r.some((i) => i.assumed)), "assumed");
  assert.ok(recipes.some((r) => r.some((i) => stateOf(i) === "running low")), "running low");
  assert.ok(recipes.some((r) => r.some((i) => i.itemId === deleted[0]?.id)), "soft-deleted Item");
});

test("owner-with-recipes seeds a Recipe with every optional field set", () => {
  const recipes = recipesOf(SCENARIOS["owner-with-recipes"]);
  const full = recipes.find(
    (r) =>
      r.prepSteps.length > 0 &&
      r.steps.length > 1 &&
      r.servings !== undefined &&
      r.sourceUrl !== undefined &&
      r.notes !== undefined &&
      r.ingredients.every((i) => i.quantity !== undefined && i.unit !== undefined && i.prepNote !== undefined),
  );
  assert.ok(full);
});

test("owner-with-recipes seeds a soft-deleted Recipe", () => {
  const recipes = recipesOf(SCENARIOS["owner-with-recipes"]);
  assert.equal(recipes.filter((r) => r.deletedAt !== undefined).length, 1);
});

test("owner-with-foods holds live Foods, one with every field, and a soft-deleted one", () => {
  const foods = SCENARIOS["owner-with-foods"].fixtures
    .filter((f) => f.collection === "foods")
    .map((f) => foodSchema.parse(f.data));
  assert.ok(foods.filter((f) => f.deletedAt === undefined).length >= 3, "a few live Foods");
  assert.ok(foods.some((f) => f.deletedAt !== undefined), "soft-deleted");
  assert.ok(foods.some((f) => f.place !== undefined && f.servingLabel !== undefined && f.estimated === true), "full-field");
});

test("owner-with-foods holds a day of the Owner's Log Entries: every meal, a synced one and a soft-deleted one", () => {
  const [owner] = SCENARIOS["owner-with-foods"].users;
  const entries = SCENARIOS["owner-with-foods"].fixtures
    .filter((f) => f.collection === `nutritionLogs/${owner.uid}/entries`)
    .map((f) => logEntrySchema.parse(f.data));
  const live = entries.filter((e) => e.deletedAt === undefined);
  assert.deepEqual(new Set(live.map((e) => e.mealType)), new Set(["breakfast", "lunch", "dinner", "snack"]));
  assert.ok(live.some((e) => e.source.kind === "food") && live.some((e) => e.source.kind === "quick"));
  assert.ok(live.some((e) => e.googleHealthId !== undefined) && live.some((e) => e.googleHealthId === undefined));
  assert.ok(entries.some((e) => e.deletedAt !== undefined), "soft-deleted");
});
