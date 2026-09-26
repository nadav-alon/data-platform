import type { ZodType } from "zod";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

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
 * Fails naming `fixture.name` the moment either side stops agreeing with
 * `fixture.expected`, rather than reporting a bare assertion the fixture list
 * gets long enough to make anonymous.
 */
export async function assertFixture(
  fixture: RulesFixture,
  schema: ZodType,
  testEnv: RulesTestEnvironment,
): Promise<void> {
  const zodVerdict: RulesVerdict = schema.safeParse(fixture.doc.data).success
    ? "accept"
    : "reject";
  if (zodVerdict !== fixture.expected) {
    throw new Error(
      `fixture "${fixture.name}": zod would ${zodVerdict} this document, expected ${fixture.expected}`,
    );
  }

  const context =
    fixture.auth === null
      ? testEnv.unauthenticatedContext()
      : testEnv.authenticatedContext(fixture.auth.uid);
  const write = context
    .firestore()
    .collection(fixture.collection)
    .doc(fixture.doc.id)
    .set(fixture.doc.data);

  try {
    if (fixture.expected === "accept") {
      await assertSucceeds(write);
    } else {
      await assertFails(write);
    }
  } catch (cause) {
    throw new Error(
      `fixture "${fixture.name}": firestore.rules would not ${fixture.expected} this document`,
      { cause },
    );
  }
}
