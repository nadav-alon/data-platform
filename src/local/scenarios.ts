import { email, type Email } from "../core/email.ts";
import type { FirestoreTimestamp } from "../core/timestamp.ts";
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

const householdMeta = (ownerUid: Uid): Fixture => ({
  collection: "meta",
  id: "household",
  data: { owner: ownerUid },
});

const memberDoc = ({ uid, email }: ScenarioUser): Fixture => ({
  collection: "members",
  id: uid,
  data: { email, addedAt },
});

/**
 * The named Households the local kit can seed. `empty` is an unclaimed Household; the others are
 * claimed, and every `users` entry is seeded as a Member (the Owner included) so the emulator's
 * fake Google sign-in as that email lands on a Member the rules let in.
 */
export const SCENARIOS = {
  empty: { users: [], fixtures: [] },
  "owner-with-items": {
    users: [owner],
    fixtures: [
      householdMeta(owner.uid),
      memberDoc(owner),
      { collection: "shops", id: "grocery", data: { name: "Grocery", referenceCount: 1 } },
      {
        collection: "categories",
        id: "cleaning",
        data: { name: "Cleaning", defaultShopId: "grocery", referenceCount: 1 },
      },
      { collection: "items", id: "dishSoap", data: { name: "Dish soap", state: "enough" } },
      { collection: "items", id: "sponges", data: { name: "Sponges", state: "running low" } },
      {
        collection: "catalogueItems",
        id: "dishSoap",
        data: { categoryId: "cleaning", necessity: "essential" },
      },
    ],
  },
  "invited-member": {
    users: [member],
    fixtures: [
      householdMeta(owner.uid),
      memberDoc(owner),
      memberDoc(member),
      { collection: "items", id: "dishSoap", data: { name: "Dish soap", state: "out" } },
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
