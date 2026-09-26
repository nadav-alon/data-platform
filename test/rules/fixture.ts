import type { ZodType } from "zod";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";

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
  readonly auth: { readonly uid: string } | null;
  readonly expected: RulesVerdict;
}

/**
 * Fails naming `fixture.name` and both verdicts once either side stops
 * agreeing with `fixture.expected`, so a mistyped fixture (rules agree with
 * zod) can be told apart from real drift (rules and zod disagree).
 */
export async function assertFixture(
  fixture: RulesFixture,
  schema: ZodType,
  testEnv: RulesTestEnvironment,
): Promise<void> {
  const zodVerdict: RulesVerdict = schema.safeParse(fixture.doc.data).success
    ? "accept"
    : "reject";

  const context =
    fixture.auth === null
      ? testEnv.unauthenticatedContext()
      : testEnv.authenticatedContext(fixture.auth.uid);
  const write = context
    .firestore()
    .collection(fixture.collection)
    .doc(fixture.doc.id)
    .set(fixture.doc.data);
  const rulesVerdict: RulesVerdict = await write.then(
    () => "accept",
    () => "reject",
  );

  if (zodVerdict !== fixture.expected || rulesVerdict !== fixture.expected) {
    throw new Error(
      `fixture "${fixture.name}": expected ${fixture.expected}, zod ${zodVerdict}, rules ${rulesVerdict}`,
    );
  }
}
