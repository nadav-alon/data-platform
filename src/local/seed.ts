import type { ZodType } from "zod";
import type { CollectionSchemas } from "../core/index.ts";
import { COLLECTION_SCHEMAS } from "../index.ts";

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
 * The schema a fixture is checked against: `${collection}/${id}` first, for a collection like
 * `meta` whose schema depends on the doc id, then `collection` itself — normalized to
 * `${parent}/*\/${subcollection}` when it names one doc nested under a variable parent id.
 */
function schemaFor(
  schemas: CollectionSchemas,
  collection: string,
  id: string,
): ZodType | undefined {
  const segments = collection.split("/");
  const normalizedCollection =
    segments.length === 3 ? `${segments[0]}/*/${segments[2]}` : collection;
  return schemas[`${collection}/${id}`] ?? schemas[normalizedCollection];
}

/**
 * Checks every fixture against its collection's schema in `COLLECTION_SCHEMAS`, then writes them
 * all. Validation finishes before the first write, so a fixture that drifted from its schema
 * throws — naming the collection and doc — without leaving a half-seeded Household behind. A
 * fixture for a collection with no schema throws the same way.
 */
export async function seedFixtures(
  writer: FixtureWriter,
  fixtures: readonly Fixture[],
  schemas: CollectionSchemas = COLLECTION_SCHEMAS,
): Promise<void> {
  for (const { collection, id, data } of fixtures) {
    const schema = schemaFor(schemas, collection, id);
    if (!schema) {
      throw new Error(`No schema for fixture ${collection}/${id}`);
    }
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `Fixture ${collection}/${id} fails its schema: ${result.error.message}`,
      );
    }
  }
  for (const { collection, id, data } of fixtures) {
    await writer.set(`${collection}/${id}`, data);
  }
}
