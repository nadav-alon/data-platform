import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore, FirestoreSettings } from "firebase/firestore";
import { connectLocal } from "../local/connect-local.ts";
import { LOCAL_PROJECT_ID } from "../local/emulator-config.ts";
import { initFirebaseWith, type FirebaseDeps } from "./init-firebase.ts";

const config: FirebaseOptions = { projectId: "a-real-project", apiKey: "key" };

function fakeDeps(projectId: string | undefined) {
  const app = { name: "the app", options: { projectId } } as FirebaseApp;
  const db = { type: "firestore" } as unknown as Firestore;
  const order: string[] = [];
  const calls = {
    appConfigs: [] as (FirebaseOptions | undefined)[],
    settings: [] as { app: FirebaseApp; settings: FirestoreSettings }[],
    auths: [] as FirebaseApp[],
    connected: [] as FirebaseApp[],
  };
  const deps: FirebaseDeps = {
    initializeApp: ((options?: FirebaseOptions) => {
      calls.appConfigs.push(options);
      return app;
    }) as FirebaseDeps["initializeApp"],
    initializeFirestore: ((a: FirebaseApp, settings: FirestoreSettings) => {
      order.push("firestore");
      calls.settings.push({ app: a, settings });
      return db;
    }) as FirebaseDeps["initializeFirestore"],
    initLocalAuth: ((a: FirebaseApp) => {
      order.push("auth");
      calls.auths.push(a);
      return {} as Auth;
    }) as FirebaseDeps["initLocalAuth"],
    connectLocal: ((a: FirebaseApp) => {
      order.push("connect");
      calls.connected.push(a);
    }) as FirebaseDeps["connectLocal"],
  };
  return { app, db, calls, order, deps };
}

test("initFirebase returns the app and a Firestore with a persistent local cache", () => {
  const { app, db, calls, deps } = fakeDeps(config.projectId);

  const client = initFirebaseWith(deps, config);

  assert.equal(client.app, app);
  assert.equal(client.db, db);
  assert.deepEqual(calls.appConfigs, [config]);
  assert.equal(calls.settings.length, 1);
  assert.equal(calls.settings[0]?.app, app);
  const cache = calls.settings[0]?.settings.localCache as { kind?: string } | undefined;
  assert.equal(cache?.kind, "persistent");
  assert.deepEqual(calls.auths, []);
  assert.deepEqual(calls.connected, []);
});

test("initFirebase in local mode uses a memory cache, then Auth, then connects the local kit", () => {
  const { app, db, calls, order, deps } = fakeDeps(LOCAL_PROJECT_ID);

  const client = initFirebaseWith(deps, { projectId: LOCAL_PROJECT_ID }, { local: true });

  assert.equal(client.db, db);
  const cache = calls.settings[0]?.settings.localCache as { kind?: string } | undefined;
  assert.equal(cache?.kind, "memory");
  assert.deepEqual(calls.auths, [app]);
  assert.deepEqual(calls.connected, [app]);
  assert.deepEqual(order, ["firestore", "auth", "connect"]);
});

test("initFirebase in local mode refuses a config for any other project", () => {
  const { deps } = fakeDeps(config.projectId);

  assert.throws(
    () => initFirebaseWith({ ...deps, connectLocal }, config, { local: true }),
    /a-real-project/,
  );
});
