import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import { LOCAL_PROJECT_ID } from "../local/emulator-config.ts";
import { connectLocal } from "../local/connect-local.ts";
import {
  initFirebaseWith,
  terminateFirebaseWith,
  type FirebaseDeps,
  type TerminateDeps,
} from "./init-firebase.ts";
import { fakeDeps } from "./fake-deps.test-support.ts";

const config: FirebaseOptions = { projectId: "a-real-project", apiKey: "key" };

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
  assert.deepEqual(calls.auths, []);
  assert.deepEqual(calls.connected, []);
});

test("initFirebase's persistent cache is shared across tabs and apps on the origin", () => {
  const { calls, deps } = fakeDeps();

  initFirebaseWith(deps, config);

  assert.equal(calls.tabManagers.length, 1);
  const cache = calls.caches[0] as { tabManager?: unknown };
  assert.equal(cache.tabManager, calls.tabManagers[0]);
  assert.equal(calls.settings[0]?.settings.localCache, cache);
});

test("initFirebase in local mode uses a memory cache, then Auth, then connects the local kit", () => {
  const { app, db, calls, order, deps, kit } = fakeDeps();

  const client = initFirebaseWith(deps, { projectId: LOCAL_PROJECT_ID }, { local: kit });

  assert.equal(client.db, db);
  const cache = calls.settings[0]?.settings.localCache as { kind?: string } | undefined;
  assert.equal(cache?.kind, "memory");
  assert.deepEqual(calls.auths, [app]);
  assert.deepEqual(calls.connected, [app]);
  assert.deepEqual(order, ["firestore", "auth", "connect"]);
});

test("initFirebase in local mode refuses a config for any other project", () => {
  const { deps, kit } = fakeDeps();

  // The real connectLocal, not the fake: it owns the project-ID guard under test.
  assert.throws(
    () => initFirebaseWith(deps, config, { local: { ...kit, connectLocal } }),
    /a-real-project/,
  );
});

function fakeTerminateDeps(
  onTerminate: (db: Firestore) => Promise<void> | void = () => {},
  onDelete: (app: FirebaseApp) => Promise<void> | void = () => {},
): TerminateDeps {
  return {
    terminate: (async (db: Firestore) => {
      await onTerminate(db);
    }) as TerminateDeps["terminate"],
    deleteApp: (async (app: FirebaseApp) => {
      await onDelete(app);
    }) as TerminateDeps["deleteApp"],
  };
}

test("terminateFirebase terminates Firestore, then deletes the app", async () => {
  const { app, db } = fakeDeps();
  const order: string[] = [];
  const deps = fakeTerminateDeps(
    async (d) => {
      await Promise.resolve();
      order.push(d === db ? "terminate db" : "terminate other");
    },
    (a) => {
      order.push(a === app ? "delete app" : "delete other");
    },
  );

  await terminateFirebaseWith(deps, { app, db });

  assert.deepEqual(order, ["terminate db", "delete app"]);
});

test("initFirebase runs again from a different config after terminateFirebase", async () => {
  // One registry shared by init and terminate, like Firebase's: `[DEFAULT]` is taken until
  // `deleteApp` frees it.
  const taken = new Set<string>();
  const db = { type: "firestore" } as unknown as Firestore;
  const { deps } = fakeDeps();
  const initDeps: FirebaseDeps = {
    ...deps,
    initializeApp: ((options?: FirebaseOptions) => {
      if (taken.has("[DEFAULT]")) throw new Error("duplicate-app");
      taken.add("[DEFAULT]");
      return { name: "[DEFAULT]", options } as FirebaseApp;
    }) as FirebaseDeps["initializeApp"],
    initializeFirestore: (() => db) as FirebaseDeps["initializeFirestore"],
  };
  const terminateDeps = fakeTerminateDeps(undefined, (a) => {
    taken.delete(a.name);
  });
  const other: FirebaseOptions = { projectId: "another-project", apiKey: "key2" };

  const client = initFirebaseWith(initDeps, config);
  assert.throws(() => initFirebaseWith(initDeps, other), /duplicate-app/);
  await terminateFirebaseWith(terminateDeps, client);
  const next = initFirebaseWith(initDeps, other);

  assert.equal(next.app.options.projectId, "another-project");
});
