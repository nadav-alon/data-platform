import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { connectLocal } from "./connect-local.ts";
import { LOCAL_PROJECT_ID } from "./emulator-config.ts";

test("connectLocal with no options points Auth at the default 127.0.0.1:9099", async () => {
  const app = initializeApp(
    { projectId: LOCAL_PROJECT_ID, apiKey: "fake" },
    "connect-local-default",
  );
  try {
    connectLocal(app);
    assert.deepEqual(getAuth(app).emulatorConfig, {
      protocol: "http",
      host: "127.0.0.1",
      port: 9099,
      options: { disableWarnings: true },
    });
  } finally {
    await deleteApp(app);
  }
});

test("connectLocal throws on a malformed host naming it", async () => {
  const app = initializeApp(
    { projectId: LOCAL_PROJECT_ID, apiKey: "fake" },
    "connect-local-bad",
  );
  try {
    assert.throws(
      () => connectLocal(app, { authHost: "" }),
      /Not an EmulatorHost: ""/,
    );
    assert.throws(
      () => connectLocal(app, { firestoreHost: "localhost" }),
      /"localhost"/,
    );
  } finally {
    await deleteApp(app);
  }
});
