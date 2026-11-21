import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import {
  initFirebaseWith,
  type FirebaseDeps,
} from "../client/init-firebase.ts";
import { isFirebaseWebConfig } from "../client/web-config.ts";
import { LOCAL_PROJECT_ID } from "./emulator-config.ts";
import { localKit } from "./local-kit.ts";
import { LOCAL_WEB_CONFIG } from "./local-web-config.ts";

test("LOCAL_WEB_CONFIG is a web config for LOCAL_PROJECT_ID", () => {
  assert.equal(isFirebaseWebConfig(LOCAL_WEB_CONFIG), true);
  assert.equal(LOCAL_WEB_CONFIG.projectId, LOCAL_PROJECT_ID);
});

test("initFirebase in local mode accepts LOCAL_WEB_CONFIG", () => {
  const deps = {
    initializeApp: ((options?: FirebaseOptions) => ({
      name: "app",
      options,
    })) as FirebaseDeps["initializeApp"],
    initializeFirestore: (() =>
      ({}) as Firestore) as FirebaseDeps["initializeFirestore"],
    persistentMultipleTabManager:
      (() => ({})) as unknown as FirebaseDeps["persistentMultipleTabManager"],
    persistentLocalCache:
      (() => ({})) as unknown as FirebaseDeps["persistentLocalCache"],
  } satisfies FirebaseDeps;
  const connected: FirebaseApp[] = [];
  const kit = {
    ...localKit,
    initLocalAuth: () => ({}) as never,
    connectLocal: (a: FirebaseApp) => void connected.push(a),
  };

  initFirebaseWith(deps, LOCAL_WEB_CONFIG, { local: kit });

  assert.equal(connected.length, 1);
});
