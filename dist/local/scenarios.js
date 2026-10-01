import { email } from "../core/email.js";
import { uid } from "../core/uid.js";
import { seedFixtures } from "./seed.js";
const addedAt = { seconds: 1_700_000_000, nanoseconds: 0 };
const owner = { uid: uid("local-owner"), email: email("owner@example.com"), role: "owner" };
const member = { uid: uid("local-member"), email: email("member@example.com"), role: "member" };
const householdMeta = (ownerUid) => ({
    collection: "meta",
    id: "household",
    data: { owner: ownerUid },
});
const memberDoc = ({ uid, email }) => ({
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
