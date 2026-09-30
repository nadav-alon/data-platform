import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { connectLocal } from "../../src/local/connect-local.ts";
import { AUTH_EMULATOR_PORT, EMULATOR_HOST } from "../../src/local/emulator-config.ts";

test("connectLocal points Auth and Firestore at the emulators", async () => {
  const app = initializeApp({ projectId: "demo-connect-local", apiKey: "fake" }, "connect-local");
  try {
    connectLocal(app);

    assert.deepEqual(getAuth(app).emulatorConfig, {
      protocol: "http",
      host: EMULATOR_HOST,
      port: AUTH_EMULATOR_PORT,
      options: { disableWarnings: true },
    });

    // Reaching the emulator's rules is what turns this read into permission-denied; a real
    // backend would hang or fail on the network instead.
    await assert.rejects(getDoc(doc(getFirestore(app), "items/dishSoap")), {
      code: "permission-denied",
    });
  } finally {
    await deleteApp(app);
  }
});
