import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { withEmulatorWriter } from "../../src/local/admin-writer.ts";
import { seedScenario } from "../../src/local/scenarios.ts";
import { seedFixtures } from "../../src/local/seed.ts";
import { assertSucceeds } from "@firebase/rules-unit-testing";
import { setupRulesTestEnv } from "./test-env.ts";

const ref = setupRulesTestEnv();

const projectId = process.env.GCLOUD_PROJECT;
const host = process.env.FIRESTORE_EMULATOR_HOST;

async function readDoc(path: string) {
  const app = initializeApp({ projectId }, `read-${Date.now()}`);
  try {
    return await getFirestore(app).doc(path).get();
  } finally {
    await deleteApp(app);
  }
}

test("seedFixtures writes validated fixtures into the Firestore emulator, timestamps as Timestamps", async () => {
  await withEmulatorWriter((writer) =>
    seedFixtures(writer, [
      { collection: "shops", id: "pharmacy", data: { name: "Pharmacy", referenceCount: 0 } },
      {
        collection: "members",
        id: "uid-1",
        data: { email: "a@example.com", addedAt: { seconds: 1_700_000_000, nanoseconds: 0 } },
      },
    ]),
    { projectId, host },
  );

  assert.equal((await readDoc("shops/pharmacy")).get("name"), "Pharmacy");
  const addedAt = (await readDoc("members/uid-1")).get("addedAt");
  assert.ok(addedAt instanceof Timestamp);
  assert.equal(addedAt.seconds, 1_700_000_000);
});

test("seedFixtures leaves the emulator untouched when a fixture fails its schema", async () => {
  await assert.rejects(
    withEmulatorWriter((writer) =>
      seedFixtures(writer, [
        { collection: "shops", id: "ok", data: { name: "Ok", referenceCount: 0 } },
        { collection: "shops", id: "bad", data: { name: "" } },
      ]),
      { projectId, host },
    ),
    /shops\/bad/,
  );
  assert.equal((await readDoc("shops/ok")).exists, false);
});

for (const name of ["owner-with-items", "invited-member"] as const) {
  test(`the ${name} scenario lets its signed-in user read the Household under the rules`, async () => {
    const { users } = await withEmulatorWriter((writer) => seedScenario(writer, name), {
      projectId,
      host,
    });
    const [user] = users;
    assert.ok(user);

    const db = ref.env.authenticatedContext(user.uid, { email: user.email }).firestore();
    await assertSucceeds(db.doc("items/dishSoap").get());
  });
}

test("the empty scenario seeds nothing", async () => {
  await withEmulatorWriter((writer) => seedScenario(writer, "empty"), { projectId, host });
  assert.equal((await readDoc("meta/household")).exists, false);
});
