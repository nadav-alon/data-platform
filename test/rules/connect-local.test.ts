import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { connectLocal } from "../../src/local/connect-local.ts";
import { LOCAL_PROJECT_ID } from "../../src/local/emulator-config.ts";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;

test("connectLocal points Auth and Firestore at the emulators", async () => {
  assert.ok(
    authHost && firestoreHost,
    "run this suite through `npm run test:rules`",
  );
  const app = initializeApp(
    { projectId: LOCAL_PROJECT_ID, apiKey: "fake" },
    "connect-local",
  );
  try {
    connectLocal(app, { authHost, firestoreHost });

    // The expected values are literal splits of the env, not a reuse of connectLocal's parsing.
    const [expectedAuthHost, expectedAuthPort] = authHost.split(":");
    assert.deepEqual(getAuth(app).emulatorConfig, {
      protocol: "http",
      host: expectedAuthHost,
      port: Number(expectedAuthPort),
      options: { disableWarnings: true },
    });
    // The SDK keeps the Firestore emulator address in its settings; it has no public getter.
    const settings = (
      getFirestore(app) as unknown as { _settings: { host: string } }
    )._settings;
    assert.equal(settings.host, firestoreHost);

    // Reaching the emulator's rules is what turns this read into permission-denied; a real
    // backend would hang or fail on the network instead.
    await assert.rejects(getDoc(doc(getFirestore(app), "items/dishSoap")), {
      code: "permission-denied",
    });
  } finally {
    await deleteApp(app);
  }
});

test("connectLocal throws naming both project IDs when the app has another project ID", async () => {
  const app = initializeApp(
    { projectId: "my-real-project", apiKey: "fake" },
    "connect-local-wrong",
  );
  try {
    assert.throws(
      () => connectLocal(app),
      (error: Error) =>
        error.message.includes(LOCAL_PROJECT_ID) &&
        error.message.includes("my-real-project"),
    );
  } finally {
    await deleteApp(app);
  }
});
