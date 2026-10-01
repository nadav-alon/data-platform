import { email } from "../core/email.js";
import { HOUSEHOLD_DOC_PATH } from "../core/household.js";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION } from "../core/platform.js";
import { uid } from "../core/uid.js";
import { seedFixtures } from "./seed.js";
const addedAt = { seconds: 1_700_000_000, nanoseconds: 0 };
const owner = { uid: uid("local-owner"), email: email("owner@example.com"), role: "owner" };
const member = { uid: uid("local-member"), email: email("member@example.com"), role: "member" };
/** A fixture at a `collection/id` doc path; anything else is a typo in the path, so it throws. */
const fixtureAt = (docPath, data) => {
    const segments = docPath.split("/");
    const [collection, id] = segments;
    if (segments.length !== 2 || !collection || !id) {
        throw new Error(`fixture path "${docPath}" is not "collection/id"`);
    }
    return { collection, id, data };
};
const householdMeta = (ownerUid) => fixtureAt(HOUSEHOLD_DOC_PATH, { owner: ownerUid });
/** What a Household deploy writes, so an app pinned to this release finds a matching platform. */
const platformMetaFixture = fixtureAt(PLATFORM_DOC_PATH, { version: PLATFORM_VERSION });
const memberDoc = ({ uid, email }) => ({
    collection: "members",
    id: uid,
    data: { email, addedAt },
});
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
            platformMetaFixture,
            householdMeta(owner.uid),
            memberDoc(owner),
            memberDoc(member),
            { collection: "items", id: "dishSoap", data: { name: "Dish soap", state: "out" } },
        ],
    },
};
export const SCENARIO_NAMES = Object.keys(SCENARIOS);
/** The scenario names as one comma-separated list, for error messages. */
export function knownScenarios() {
    return SCENARIO_NAMES.join(", ");
}
export function isScenarioName(value) {
    return Object.hasOwn(SCENARIOS, value);
}
/** Narrows a CLI argument to a known scenario, or throws listing the known ones. */
export function scenarioName(value) {
    if (!isScenarioName(value)) {
        throw new Error(`Unknown scenario ${JSON.stringify(value)}; known scenarios: ${knownScenarios()}`);
    }
    return value;
}
/** Seeds the named scenario's fixtures (narrow outside input with {@link scenarioName} first), validated against `COLLECTION_SCHEMAS`. */
export async function seedScenario(writer, name) {
    const scenario = SCENARIOS[name];
    await seedFixtures(writer, scenario.fixtures);
    return scenario;
}
