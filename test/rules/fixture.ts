import type { ZodType } from "zod";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Uid } from "../../src/core/uid.ts";

export type RulesVerdict = "accept" | "reject";

/**
 * One case for the drift guard: a document written to `collection` by `auth`
 * (or nobody, if `null`) must land on `expected` in both the zod schema that
 * describes the collection and the emulated `firestore.rules`.
 */
export interface RulesFixture {
  readonly name: string;
  readonly collection: string;
  readonly schema: ZodType;
  readonly doc: { readonly id: string; readonly data: Record<string, unknown> };
  readonly auth: { readonly uid: Uid } | null;
  readonly expected: RulesVerdict;
}

/** One document in a batch fixture: where it's written, and what it must validate against. */
export interface RulesFixtureDoc {
  readonly collection: string;
  readonly id: string;
  readonly schema: ZodType;
  readonly data: Record<string, unknown>;
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
 */
export async function assertBatchFixture(
  fixture: RulesBatchFixture,
  testEnv: RulesTestEnvironment,
): Promise<void> {
  const zodVerdict: RulesVerdict = fixture.docs.every(
    (doc) => doc.schema.safeParse(doc.data).success,
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
  const doc: RulesFixtureDoc = {
    collection: fixture.collection,
    id: fixture.doc.id,
    schema: fixture.schema,
    data: fixture.doc.data,
  };

  await assertBatchFixture(
    { name: fixture.name, docs: [doc], auth: fixture.auth, expected: fixture.expected },
    testEnv,
  );
}
