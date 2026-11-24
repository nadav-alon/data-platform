import { email } from "../core/email.js";
import { HOUSEHOLD_DOC_PATH } from "../core/household.js";
import { PLATFORM_DOC_PATH, PLATFORM_VERSION } from "../core/platform.js";
import { itemId } from "../core/item.js";
import { uid } from "../core/uid.js";
import { recipeId } from "../recipes/recipe.js";
import { foodId } from "../nutrition/food.js";
import { grams, kcal } from "../nutrition/nutrition.js";
import { googleHealthId, logEntryId } from "../nutrition/log-entry.js";
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
/** The Shop every scenario's Category defaults to; one Category references it. */
const groceryShop = {
    collection: "shops",
    id: "grocery",
    data: { name: "Grocery", referenceCount: 1 },
};
/** The `cleaning` Category; its `referenceCount` is the number of catalogue Items in the scenario that name it. */
const cleaningCategory = (referenceCount) => ({
    collection: "categories",
    id: "cleaning",
    data: { name: "Cleaning", defaultShopId: "grocery", referenceCount },
});
/** The `pantry` Category; its `referenceCount` is the live CatalogueItems naming it, so soft-deleted Cinnamon is not counted. */
const pantryCategory = (referenceCount) => ({
    collection: "categories",
    id: "pantry",
    data: { name: "Pantry", defaultShopId: "grocery", referenceCount },
});
const dishSoapCatalogueItem = {
    collection: "catalogueItems",
    id: "dishSoap",
    data: { categoryId: "cleaning", necessity: "essential" },
};
/** A Pantry Item's Item doc and live CatalogueItem, so the home catalogue shows it. */
const pantryItem = (id, name, state) => [
    { collection: "items", id, data: { name, state } },
    { collection: "catalogueItems", id, data: { categoryId: "pantry", necessity: "important" } },
];
const recipe = (id, title, ingredients, optional = {}) => ({
    collection: "recipes",
    id,
    data: { title, ingredients, prepSteps: [], steps: ["Cook"], ...optional },
});
const macros = (k, protein, carbs, fat) => ({
    kcal: kcal(k),
    proteinG: grams(protein),
    carbsG: grams(carbs),
    fatG: grams(fat),
});
const food = (id, name, perServing, optional = {}) => ({
    collection: "foods",
    id,
    data: { name, perServing, ...optional },
});
/** Midnight UTC on the day `addedAt` falls on; a Log Entry's `eatenAt` is an hour after it. */
const dayStart = addedAt.seconds - (addedAt.seconds % 86_400);
const logEntry = (owner, id, hour, entry) => ({
    collection: `nutritionLogs/${owner.uid}/entries`,
    id,
    data: { eatenAt: { seconds: dayStart + hour * 3600, nanoseconds: 0 }, ...entry },
});
/** A soft-deleted Item with its CatalogueItem: it holds no reference, so `pantry` does not count it. */
const retiredSpice = [
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
            pantryCategory(6),
            ...pantryItem(itemId("flour"), "Flour", "enough"),
            ...pantryItem(itemId("milk"), "Milk", "enough"),
            ...pantryItem(itemId("eggs"), "Eggs", "enough"),
            ...pantryItem(itemId("butter"), "Butter", "running low"),
            ...pantryItem(itemId("sugar"), "Sugar", "out"),
            ...pantryItem(itemId("tomatoes"), "Tomatoes", "out"),
            ...retiredSpice,
            recipe(recipeId("pancakes"), "Pancakes", [
                { name: "Flour", itemId: itemId("flour") },
                { name: "Milk", itemId: itemId("milk") },
                { name: "Eggs", itemId: itemId("eggs") },
            ]),
            recipe(recipeId("sugar-cookies"), "Sugar cookies", [
                { name: "Flour", itemId: itemId("flour") },
                { name: "Eggs", itemId: itemId("eggs") },
                { name: "Sugar", itemId: itemId("sugar") },
            ]),
            recipe(recipeId("tomato-jam"), "Tomato jam", [
                { name: "Flour", itemId: itemId("flour") },
                { name: "Tomatoes", itemId: itemId("tomatoes") },
                { name: "Sugar", itemId: itemId("sugar") },
            ]),
            recipe(recipeId("omelette"), "Omelette", [{ name: "Eggs", itemId: itemId("eggs") }, { name: "Chives" }]),
            recipe(recipeId("scrambled-eggs"), "Scrambled eggs", [
                { name: "Eggs", itemId: itemId("eggs") },
                { name: "Salt", assumed: true },
            ]),
            recipe(recipeId("shortbread"), "Shortbread", [
                { name: "Flour", itemId: itemId("flour") },
                { name: "Butter", itemId: itemId("butter") },
            ]),
            recipe(recipeId("spice-cake"), "Spice cake", [
                { name: "Flour", itemId: itemId("flour") },
                { name: "Cinnamon", itemId: itemId("cinnamon") },
            ]),
            recipe(recipeId("banana-bread"), "Banana bread", [
                { name: "Bananas", quantity: 3, unit: "piece", prepNote: "very ripe" },
                { name: "Flour", itemId: itemId("flour"), quantity: 250, unit: "g", prepNote: "sifted" },
                { name: "Eggs", itemId: itemId("eggs"), quantity: 2, unit: "piece", prepNote: "beaten" },
                { name: "Butter", itemId: itemId("butter"), quantity: 2, unit: "tbsp", prepNote: "melted" },
            ], {
                prepSteps: ["Heat the oven to 180C", "Grease a loaf tin"],
                steps: ["Mash the bananas", "Mix in the wet ingredients", "Fold in the flour", "Bake for 55 minutes"],
                servings: 8,
                sourceUrl: "https://example.com/banana-bread",
                notes: "Keeps for three days in a tin.",
            }),
            recipe(recipeId("retired-stew"), "Retired stew", [{ name: "Tomatoes", itemId: itemId("tomatoes") }], {
                deletedAt: addedAt,
            }),
        ],
    },
    "owner-with-foods": {
        users: [owner],
        fixtures: [
            platformMetaFixture,
            householdMeta(owner.uid),
            memberDoc(owner),
            food(foodId("schnitzel-plate"), "Chicken schnitzel plate", macros(720, 38, 64, 33), {
                place: "work canteen",
                servingLabel: "1 plate",
                estimated: true,
            }),
            food(foodId("protein-bar"), "Protein bar", macros(210, 20, 22, 7), {
                servingLabel: "1 bar",
            }),
            food(foodId("falafel-pita"), "Falafel in a pita", macros(560, 18, 74, 21), {
                place: "corner stand",
                estimated: true,
            }),
            food(foodId("old-salad"), "Old canteen salad", macros(180, 6, 14, 11), {
                deletedAt: addedAt,
            }),
            logEntry(owner, logEntryId("breakfast"), 7, {
                mealType: "breakfast",
                source: { kind: "quick" },
                name: "Yogurt and granola",
                servings: 1,
                nutrition: macros(320, 14, 45, 9),
                googleHealthId: googleHealthId("gh-breakfast"),
            }),
            logEntry(owner, logEntryId("lunch"), 13, {
                mealType: "lunch",
                source: { kind: "food", foodId: foodId("schnitzel-plate") },
                name: "Chicken schnitzel plate",
                servings: 1.5,
                nutrition: macros(1080, 57, 96, 49.5),
            }),
            logEntry(owner, logEntryId("snack"), 16, {
                mealType: "snack",
                source: { kind: "food", foodId: foodId("protein-bar") },
                name: "Protein bar",
                servings: 1,
                nutrition: macros(210, 20, 22, 7),
            }),
            logEntry(owner, logEntryId("dinner"), 20, {
                mealType: "dinner",
                source: { kind: "food", foodId: foodId("falafel-pita") },
                name: "Falafel in a pita",
                servings: 1,
                nutrition: macros(560, 18, 74, 21),
            }),
            logEntry(owner, logEntryId("mistake"), 21, {
                mealType: "snack",
                source: { kind: "quick" },
                name: "Logged twice",
                servings: 1,
                nutrition: macros(100, 1, 20, 1),
                deletedAt: addedAt,
            }),
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
