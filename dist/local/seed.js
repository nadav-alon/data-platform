import { COLLECTION_SCHEMAS } from "../index.js";
/**
 * The schema a fixture is checked against: `${collection}/${id}` first, for a collection like
 * `meta` whose schema depends on the doc id, then `collection` itself — normalized to
 * `${parent}/*\/${subcollection}` when it names one doc nested under a variable parent id.
 */
function schemaFor(schemas, collection, id) {
    const segments = collection.split("/");
    const normalizedCollection = segments.length === 3 ? `${segments[0]}/*/${segments[2]}` : collection;
    return schemas[`${collection}/${id}`] ?? schemas[normalizedCollection];
}
/**
 * Checks every fixture against its collection's schema in `COLLECTION_SCHEMAS`, then writes them
 * all. Validation finishes before the first write, so a fixture that drifted from its schema
 * throws — naming the collection and doc — without leaving a half-seeded Household behind. A
 * fixture for a collection with no schema throws the same way.
 */
export async function seedFixtures(writer, fixtures, schemas = COLLECTION_SCHEMAS) {
    for (const { collection, id, data } of fixtures) {
        const schema = schemaFor(schemas, collection, id);
        if (!schema) {
            throw new Error(`No schema for fixture ${collection}/${id}`);
        }
        const result = schema.safeParse(data);
        if (!result.success) {
            throw new Error(`Fixture ${collection}/${id} fails its schema: ${result.error.message}`);
        }
    }
    for (const { collection, id, data } of fixtures) {
        await writer.set(`${collection}/${id}`, data);
    }
}
