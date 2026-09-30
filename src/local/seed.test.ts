import { test } from "node:test";
import assert from "node:assert/strict";
import { seedFixtures, type FixtureWriter } from "./seed.ts";

function recordingWriter(): FixtureWriter & { readonly paths: string[] } {
  const paths: string[] = [];
  return {
    paths,
    async set(path) {
      paths.push(path);
    },
  };
}

const validShop = { name: "Pharmacy", referenceCount: 0 };

test("seedFixtures writes each fixture at its collection/id path", async () => {
  const writer = recordingWriter();
  await seedFixtures(writer, [{ collection: "shops", id: "pharmacy", data: validShop }]);
  assert.deepEqual(writer.paths, ["shops/pharmacy"]);
});

test("seedFixtures resolves a doc-path schema and a nested collection's schema", async () => {
  const writer = recordingWriter();
  await seedFixtures(writer, [
    { collection: "meta", id: "household", data: { owner: "uid-1" } },
    {
      collection: "items/dishSoap/stateHistory",
      id: "h1",
      data: { state: "out", at: { seconds: 1, nanoseconds: 0 } },
    },
  ]);
  assert.equal(writer.paths.length, 2);
});

test("seedFixtures throws naming the collection and doc of a fixture that fails its schema", async () => {
  const writer = recordingWriter();
  await assert.rejects(
    seedFixtures(writer, [
      { collection: "shops", id: "ok", data: validShop },
      { collection: "shops", id: "drifted", data: { name: "", referenceCount: -1 } },
    ]),
    /shops\/drifted/,
  );
  assert.deepEqual(writer.paths, [], "nothing is written when any fixture is invalid");
});

test("seedFixtures throws naming a fixture whose collection has no schema", async () => {
  await assert.rejects(
    seedFixtures(recordingWriter(), [{ collection: "nope", id: "x", data: {} }]),
    /nope\/x/,
  );
});
