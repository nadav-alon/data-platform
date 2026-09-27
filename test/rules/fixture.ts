import type { ZodType } from "zod";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Uid } from "../../src/core/uid.ts";
import { COLLECTION_SCHEMAS } from "../../src/index.ts";

export type RulesVerdict = "accept" | "reject";

/**
 * One case for the drift guard: a document written to `collection` by `auth`
 * (or nobody, if `null`) must land on `expected` in both the zod schema that
 * describes the collection and the emulated `firestore.rules`.
 */
export interface RulesFixture {
  readonly name: string;
  readonly collection: string;
  readonly doc: { readonly id: string; readonly data: Record<string, unknown> };
  readonly auth: { readonly uid: Uid } | null;
  readonly expected: RulesVerdict;
}

/** One document in a batch fixture: where it's written, and what it must validate against. */
export interface RulesFixtureDoc {
  readonly collection: string;
  readonly id: string;
  readonly data: Record<string, unknown>;
}

/**
 * The schema a doc is checked against: `${collection}/${id}` first, for a collection like `meta`
 * whose schema depends on the doc id, then `collection` itself — normalized to
 * `${parent}/*\/${subcollection}` when it names one doc nested under a variable parent id
 * (`items/dishSoap/stateHistory`), so the schema map can key the subcollection by its parent's
 * shape instead of resolving any path that merely ends in a known collection name.
 */
function schemaFor(
  schemas: Record<string, ZodType>,
  collection: string,
  id: string,
): ZodType | undefined {
  const segments = collection.split("/");
  const normalizedCollection =
    segments.length === 3 ? `${segments[0]}/*/${segments[2]}` : collection;
  return schemas[`${collection}/${id}`] ?? schemas[normalizedCollection];
}

/**
 * Like `RulesFixture`, but for writes that must land as one Firestore batch — e.g. the
 * Household first-claim, which creates `meta/household` and the claimant's own
 * `members/{uid}` doc together.
 */
export interface RulesBatchFixture {
  readonly name: string;
  readonly docs: readonly RulesFixtureDoc[];
  readonly auth: { readonly uid: Uid } | null;
  readonly expected: RulesVerdict;
}

/**
 * Fails naming `fixture.name` and both verdicts once either side stops
 * agreeing with `fixture.expected`, so a mistyped fixture (rules agree with
 * zod) can be told apart from real drift (rules and zod disagree).
 *
 * Each doc's schema is resolved from its own `collection` (see `schemaFor`), so a fixture can't
 * drift onto another collection's validator. An unknown collection fails the same way, naming the
 * fixture, for every doc in the batch — resolved up front, before any doc is checked against zod,
 * so one doc failing zod can't short-circuit the unknown-collection check for a later doc.
 */
export async function assertBatchFixture(
  fixture: RulesBatchFixture,
  testEnv: RulesTestEnvironment,
): Promise<void> {
  await assertBatchFixtureAgainst(fixture, testEnv, COLLECTION_SCHEMAS);
}

/**
 * Like `assertBatchFixture`, but checked against `schemas` instead of the platform's real
 * `COLLECTION_SCHEMAS`. Exists so `fixture.test.ts` can exercise the harness itself against a
 * scratch map; every other rules test should use `assertBatchFixture`/`assertFixture` so a
 * fixture can't drift onto another collection's validator by supplying its own map.
 */
export async function assertBatchFixtureAgainst(
  fixture: RulesBatchFixture,
  testEnv: RulesTestEnvironment,
  schemas: Record<string, ZodType>,
): Promise<void> {
  const schemasForDocs = fixture.docs.map((doc) => {
    const schema = schemaFor(schemas, doc.collection, doc.id);
    if (schema === undefined) {
      throw new Error(`fixture "${fixture.name}": unknown collection "${doc.collection}"`);
    }
    return { doc, schema };
  });
  const zodVerdict: RulesVerdict = schemasForDocs.every(({ doc, schema }) =>
    schema.safeParse(doc.data).success,
  )
    ? "accept"
    : "reject";

  const context =
    fixture.auth === null
      ? testEnv.unauthenticatedContext()
      : testEnv.authenticatedContext(fixture.auth.uid);
  const firestore = context.firestore();
  const batch = firestore.batch();
  for (const doc of fixture.docs) {
    batch.set(firestore.collection(doc.collection).doc(doc.id), doc.data);
  }
  const rulesVerdict: RulesVerdict = await batch.commit().then(
    () => "accept",
    () => "reject",
  );

  if (zodVerdict !== fixture.expected || rulesVerdict !== fixture.expected) {
    throw new Error(
      `fixture "${fixture.name}": expected ${fixture.expected}, zod ${zodVerdict}, rules ${rulesVerdict}`,
    );
  }
}

/** The single-doc case of `assertBatchFixture`, with the same contract. */
export async function assertFixture(
  fixture: RulesFixture,
  testEnv: RulesTestEnvironment,
): Promise<void> {
  await assertFixtureAgainst(fixture, testEnv, COLLECTION_SCHEMAS);
}

/** The single-doc case of `assertBatchFixtureAgainst`, with the same contract. */
export async function assertFixtureAgainst(
  fixture: RulesFixture,
  testEnv: RulesTestEnvironment,
  schemas: Record<string, ZodType>,
): Promise<void> {
  const doc: RulesFixtureDoc = {
    collection: fixture.collection,
    id: fixture.doc.id,
    data: fixture.doc.data,
  };

  await assertBatchFixtureAgainst(
    { name: fixture.name, docs: [doc], auth: fixture.auth, expected: fixture.expected },
    testEnv,
    schemas,
  );
}
