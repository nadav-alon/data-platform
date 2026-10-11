import type { CollectionSchemas } from "../core/index.ts";
/** One document a scenario writes: the collection (or nested collection path) and doc id it lands at. */
export interface Fixture {
    readonly collection: string;
    readonly id: string;
    readonly data: Record<string, unknown>;
}
/** Where validated fixtures are written; the Admin SDK adapter in production, a fake in unit tests. */
export interface FixtureWriter {
    set(path: string, data: Record<string, unknown>): Promise<void>;
}
/**
 * Checks every fixture against its collection's schema in `COLLECTION_SCHEMAS`, then writes them
 * all. Validation finishes before the first write, so a fixture that drifted from its schema
 * throws — naming the collection and doc — without leaving a half-seeded Household behind. A
 * fixture for a collection with no schema throws the same way.
 */
export declare function seedFixtures(writer: FixtureWriter, fixtures: readonly Fixture[], schemas?: CollectionSchemas): Promise<void>;
