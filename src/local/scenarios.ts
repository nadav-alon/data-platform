import { email, type Email } from "../core/email.ts";
import type { FirestoreTimestamp } from "../core/timestamp.ts";
import { HOUSEHOLD_DOC_PATH } from "../core/household.ts";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION } from "../core/platform.ts";
import { uid, type Uid } from "../core/uid.ts";
import { seedFixtures, type Fixture, type FixtureWriter } from "./seed.ts";

/** A Google account a scenario expects the developer to sign in as through the Auth emulator. */
export interface ScenarioUser {
  readonly uid: Uid;
  readonly email: Email;
  readonly role: "owner" | "member";
}

export interface Scenario {
  readonly users: readonly ScenarioUser[];
  readonly fixtures: readonly Fixture[];
}

const addedAt: FirestoreTimestamp = { seconds: 1_700_000_000, nanoseconds: 0 };

const owner: ScenarioUser = { uid: uid("local-owner"), email: email("owner@example.com"), role: "owner" };
const member: ScenarioUser = { uid: uid("local-member"), email: email("member@example.com"), role: "member" };

/** A fixture at a `collection/id` doc path; anything else is a typo in the path, so it throws. */
const fixtureAt = (docPath: string, data: Record<string, unknown>): Fixture => {
  const segments = docPath.split("/");
  const [collection, id] = segments;
  if (segments.length !== 2 || !collection || !id) {
    throw new Error(`fixture path "${docPath}" is not "collection/id"`);
  }
  return { collection, id, data };
};

const householdMeta = (ownerUid: Uid): Fixture =>
  fixtureAt(HOUSEHOLD_DOC_PATH, { owner: ownerUid });

/** What a Household deploy writes, so an app pinned to this release finds a matching platform. */
const platformMetaFixture: Fixture = fixtureAt(PLATFORM_DOC_PATH, { version: PLATFORM_VERSION });

const memberDoc = ({ uid, email }: ScenarioUser): Fixture => ({
  collection: "members",
  id: uid,
  data: { email, addedAt },
});

/** The Shop every scenario's Category defaults to; one Category references it. */
const groceryShop: Fixture = {
  collection: "shops",
  id: "grocery",
  data: { name: "Grocery", referenceCount: 1 },
};

/** The `cleaning` Category; its `referenceCount` is the number of catalogue Items in the scenario that name it. */
const cleaningCategory = (referenceCount: number): Fixture => ({
  collection: "categories",
  id: "cleaning",
  data: { name: "Cleaning", defaultShopId: "grocery", referenceCount },
});

const dishSoapCatalogueItem: Fixture = {
  collection: "catalogueItems",
  id: "dishSoap",
  data: { categoryId: "cleaning", necessity: "essential" },
};

/** A Pantry Item's Item doc and live CatalogueItem, so the home catalogue shows it. */
const pantryItem = (
  id: string,
  name: string,
  state: "enough" | "running low" | "out",
): Fixture[] => [
  { collection: "items", id, data: { name, state } },
  { collection: "catalogueItems", id, data: { categoryId: "pantry", necessity: "important" } },
];

const recipe = (id: string, title: string, ingredients: readonly Record<string, unknown>[]): Fixture => ({
  collection: "recipes",
  id,
  data: { title, ingredients, prepSteps: [], steps: ["Cook"] },
});

/** A soft-deleted Item with its CatalogueItem: it holds no reference, so `pantry` does not count it. */
const retiredSpice: Fixture[] = [
  { collection: "items", id: "cinnamon", data: { name: "Cinnamon", state: "out", deletedAt: addedAt } },
  {
    collection: "catalogueItems",
    id: "cinnamon",
    data: { categoryId: "pantry", necessity: "optional", deletedAt: addedAt },
  },
];

/**
 * The named Households the local kit can seed, each with the `meta/platform` a deploy of this
 * release writes. `empty` is an unclaimed Household; the others are claimed, and every `users`
 * entry is seeded as a Member (the Owner included) so the emulator's fake Google sign-in as that
 * email lands on a Member the rules let in.
 */
export const SCENARIOS = {
  empty: { users: [], fixtures: [platformMetaFixture] },
  "owner-with-items": {
    users: [owner],
    fixtures: [
      platformMetaFixture,
      householdMeta(owner.uid),
      memberDoc(owner),
      groceryShop,
      cleaningCategory(2),
      { collection: "items", id: "dishSoap", data: { name: "Dish soap", state: "enough" } },
      { collection: "items", id: "sponges", data: { name: "Sponges", state: "running low" } },
      dishSoapCatalogueItem,
      {
        collection: "catalogueItems",
        id: "sponges",
        data: { categoryId: "cleaning", necessity: "important" },
      },
    ],
  },
  "invited-member": {
    users: [member],
    fixtures: [
      platformMetaFixture,
      householdMeta(owner.uid),
      memberDoc(owner),
      memberDoc(member),
      groceryShop,
      cleaningCategory(1),
      { collection: "items", id: "dishSoap", data: { name: "Dish soap", state: "out" } },
      dishSoapCatalogueItem,
    ],
  },
  "owner-with-recipes": {
    users: [owner],
    fixtures: [
      platformMetaFixture,
      householdMeta(owner.uid),
      memberDoc(owner),
      groceryShop,
      {
        collection: "categories",
        id: "pantry",
        data: { name: "Pantry", defaultShopId: "grocery", referenceCount: 6 },
      },
      ...pantryItem("flour", "Flour", "enough"),
      ...pantryItem("milk", "Milk", "enough"),
      ...pantryItem("eggs", "Eggs", "enough"),
      ...pantryItem("butter", "Butter", "running low"),
      ...pantryItem("sugar", "Sugar", "out"),
      ...pantryItem("tomatoes", "Tomatoes", "out"),
      ...retiredSpice,
      recipe("pancakes", "Pancakes", [
        { name: "Flour", itemId: "flour" },
        { name: "Milk", itemId: "milk" },
        { name: "Eggs", itemId: "eggs" },
      ]),
      recipe("sugar-cookies", "Sugar cookies", [
        { name: "Flour", itemId: "flour" },
        { name: "Eggs", itemId: "eggs" },
        { name: "Sugar", itemId: "sugar" },
      ]),
      recipe("tomato-jam", "Tomato jam", [
        { name: "Flour", itemId: "flour" },
        { name: "Tomatoes", itemId: "tomatoes" },
        { name: "Sugar", itemId: "sugar" },
      ]),
      recipe("omelette", "Omelette", [{ name: "Eggs", itemId: "eggs" }, { name: "Chives" }]),
      recipe("scrambled-eggs", "Scrambled eggs", [
        { name: "Eggs", itemId: "eggs" },
        { name: "Salt", assumed: true },
      ]),
      recipe("shortbread", "Shortbread", [
        { name: "Flour", itemId: "flour" },
        { name: "Butter", itemId: "butter" },
      ]),
      recipe("spice-cake", "Spice cake", [
        { name: "Flour", itemId: "flour" },
        { name: "Cinnamon", itemId: "cinnamon" },
      ]),
    ],
  },
} as const satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof SCENARIOS;

export const SCENARIO_NAMES = Object.keys(SCENARIOS) as ScenarioName[];

/** The scenario names as one comma-separated list, for error messages. */
export function knownScenarios(): string {
  return SCENARIO_NAMES.join(", ");
}

export function isScenarioName(value: string): value is ScenarioName {
  return Object.hasOwn(SCENARIOS, value);
}

/** Narrows a CLI argument to a known scenario, or throws listing the known ones. */
export function scenarioName(value: string): ScenarioName {
  if (!isScenarioName(value)) {
    throw new Error(
      `Unknown scenario ${JSON.stringify(value)}; known scenarios: ${knownScenarios()}`,
    );
  }
  return value;
}

/** Seeds the named scenario's fixtures (narrow outside input with {@link scenarioName} first), validated against `COLLECTION_SCHEMAS`. */
export async function seedScenario(writer: FixtureWriter, name: ScenarioName): Promise<Scenario> {
  const scenario: Scenario = SCENARIOS[name];
  await seedFixtures(writer, scenario.fixtures);
  return scenario;
}
