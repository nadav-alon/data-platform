import { type Email } from "../core/email.ts";
import { type Uid } from "../core/uid.ts";
import { type Fixture, type FixtureWriter } from "./seed.ts";
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
/**
 * The named Households the local kit can seed. `empty` is an unclaimed Household; the others are
 * claimed, and every `users` entry is seeded as a Member (the Owner included) so the emulator's
 * fake Google sign-in as that email lands on a Member the rules let in.
 */
export declare const SCENARIOS: {
    readonly empty: {
        readonly users: readonly [];
        readonly fixtures: readonly [];
    };
    readonly "owner-with-items": {
        readonly users: readonly [ScenarioUser];
        readonly fixtures: readonly [Fixture, Fixture, {
            readonly collection: "shops";
            readonly id: "grocery";
            readonly data: {
                readonly name: "Grocery";
                readonly referenceCount: 1;
            };
        }, {
            readonly collection: "categories";
            readonly id: "cleaning";
            readonly data: {
                readonly name: "Cleaning";
                readonly defaultShopId: "grocery";
                readonly referenceCount: 1;
            };
        }, {
            readonly collection: "items";
            readonly id: "dishSoap";
            readonly data: {
                readonly name: "Dish soap";
                readonly state: "enough";
            };
        }, {
            readonly collection: "items";
            readonly id: "sponges";
            readonly data: {
                readonly name: "Sponges";
                readonly state: "running low";
            };
        }, {
            readonly collection: "catalogueItems";
            readonly id: "dishSoap";
            readonly data: {
                readonly categoryId: "cleaning";
                readonly necessity: "essential";
            };
        }];
    };
    readonly "invited-member": {
        readonly users: readonly [ScenarioUser];
        readonly fixtures: readonly [Fixture, Fixture, Fixture, {
            readonly collection: "items";
            readonly id: "dishSoap";
            readonly data: {
                readonly name: "Dish soap";
                readonly state: "out";
            };
        }];
    };
};
export type ScenarioName = keyof typeof SCENARIOS;
export declare const SCENARIO_NAMES: ScenarioName[];
/** The scenario names as one comma-separated list, for error messages. */
export declare function knownScenarios(): string;
export declare function isScenarioName(value: string): value is ScenarioName;
/** Narrows a CLI argument to a known scenario, or throws listing the known ones. */
export declare function scenarioName(value: string): ScenarioName;
/** Seeds the named scenario's fixtures (narrow outside input with {@link scenarioName} first), validated against `COLLECTION_SCHEMAS`. */
export declare function seedScenario(writer: FixtureWriter, name: ScenarioName): Promise<Scenario>;
