import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore, FirestoreSettings } from "firebase/firestore";
import { LOCAL_PROJECT_ID } from "../local/emulator-config.ts";
import { connectLocal } from "../local/connect-local.ts";
import { initFirebaseWith, type FirebaseDeps, type LocalKit } from "./init-firebase.ts";

const config: FirebaseOptions = { projectId: "a-real-project", apiKey: "key" };

function fakeDeps(projectId: string | undefined) {
  const app = { name: "the app", options: { projectId } } as FirebaseApp;
  const db = { type: "firestore" } as unknown as Firestore;
  const order: string[] = [];
  const calls = {
    appConfigs: [] as (FirebaseOptions | undefined)[],
    settings: [] as { app: FirebaseApp; settings: FirestoreSettings }[],
    tabManagers: [] as unknown[],
    caches: [] as unknown[],
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
    persistentMultipleTabManager: (() => {
      const manager = { kind: "multi-tab manager" };
      calls.tabManagers.push(manager);
      return manager;
    }) as unknown as FirebaseDeps["persistentMultipleTabManager"],
    persistentLocalCache: ((settings?: { tabManager?: unknown }) => {
      const cache = { kind: "persistent", tabManager: settings?.tabManager };
      calls.caches.push(cache);
      return cache;
    }) as unknown as FirebaseDeps["persistentLocalCache"],
  };
  const kit: LocalKit = {
    initLocalAuth: (a) => {
      order.push("auth");
      calls.auths.push(a);
      return {} as Auth;
    },
    connectLocal: (a) => {
      order.push("connect");
      calls.connected.push(a);
    },
  };
  return { app, db, calls, order, deps, kit };
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

test("initFirebase's persistent cache is shared across tabs and apps on the origin", () => {
  const { calls, deps } = fakeDeps(config.projectId);

  initFirebaseWith(deps, config);

  assert.equal(calls.tabManagers.length, 1);
  const cache = calls.caches[0] as { tabManager?: unknown };
  assert.equal(cache.tabManager, calls.tabManagers[0]);
  assert.equal(calls.settings[0]?.settings.localCache, cache);
});

test("initFirebase in local mode uses a memory cache, then Auth, then connects the local kit", () => {
  const { app, db, calls, order, deps, kit } = fakeDeps(LOCAL_PROJECT_ID);

  const client = initFirebaseWith(deps, { projectId: LOCAL_PROJECT_ID }, { local: kit });

  assert.equal(client.db, db);
  const cache = calls.settings[0]?.settings.localCache as { kind?: string } | undefined;
  assert.equal(cache?.kind, "memory");
  assert.deepEqual(calls.auths, [app]);
  assert.deepEqual(calls.connected, [app]);
  assert.deepEqual(order, ["firestore", "auth", "connect"]);
});

test("initFirebase in local mode refuses a config for any other project", () => {
  const { deps, kit } = fakeDeps(config.projectId);

  // The real connectLocal, not the fake: it owns the project-ID guard under test.
  assert.throws(
    () => initFirebaseWith(deps, config, { local: { ...kit, connectLocal } }),
    /a-real-project/,
  );
});
