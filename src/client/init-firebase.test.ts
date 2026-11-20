import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Firestore, FirestoreSettings } from "firebase/firestore";
import { LOCAL_PROJECT_ID } from "../local/emulator-config.ts";
import { initFirebaseWith, type FirebaseDeps } from "./init-firebase.ts";

const config: FirebaseOptions = { projectId: "a-real-project", apiKey: "key" };

function fakeDeps() {
  const app = { name: "the app" } as FirebaseApp;
  const db = { type: "firestore" } as unknown as Firestore;
  const calls = {
    appConfigs: [] as (FirebaseOptions | undefined)[],
    settings: [] as { app: FirebaseApp; settings: FirestoreSettings }[],
    emulators: [] as { db: Firestore; host: string; port: number }[],
  };
  const deps: FirebaseDeps = {
    initializeApp: ((options?: FirebaseOptions) => {
      calls.appConfigs.push(options);
      return app;
    }) as FirebaseDeps["initializeApp"],
    initializeFirestore: ((a: FirebaseApp, settings: FirestoreSettings) => {
      calls.settings.push({ app: a, settings });
      return db;
    }) as FirebaseDeps["initializeFirestore"],
    connectFirestoreEmulator: ((d: Firestore, host: string, port: number) => {
      calls.emulators.push({ db: d, host, port });
    }) as FirebaseDeps["connectFirestoreEmulator"],
  };
  return { app, db, calls, deps };
}

test("initFirebase returns the app and a Firestore with a persistent local cache", () => {
  const { app, db, calls, deps } = fakeDeps();

  const client = initFirebaseWith(deps, config);

  assert.equal(client.app, app);
  assert.equal(client.db, db);
  assert.deepEqual(calls.appConfigs, [config]);
  assert.equal(calls.settings.length, 1);
  assert.equal(calls.settings[0]?.app, app);
  const cache = calls.settings[0]?.settings.localCache as { kind?: string } | undefined;
  assert.equal(cache?.kind, "persistent");
  assert.deepEqual(calls.emulators, []);
});

test("initFirebase in local mode uses a memory cache and connects to the Firestore emulator", () => {
  const { db, calls, deps } = fakeDeps();

  const client = initFirebaseWith(deps, { projectId: LOCAL_PROJECT_ID }, { local: true });

  assert.equal(client.db, db);
  const cache = calls.settings[0]?.settings.localCache as { kind?: string } | undefined;
  assert.equal(cache?.kind, "memory");
  assert.deepEqual(calls.emulators, [{ db, host: "127.0.0.1", port: 8090 }]);
});

test("initFirebase in local mode refuses a config for any other project", () => {
  const { calls, deps } = fakeDeps();

  assert.throws(() => initFirebaseWith(deps, config, { local: true }), /a-real-project/);
  assert.deepEqual(calls.appConfigs, []);
});
