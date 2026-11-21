import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore, FirestoreSettings } from "firebase/firestore";
import type { FirebaseDeps, LocalKit } from "./init-firebase.ts";

/** Fake Firebase deps that record their calls; the app they build carries the options it was initialized with. */
export function fakeDeps() {
  const app = { name: "the app", options: {} as FirebaseOptions } as FirebaseApp;
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
      Object.assign(app.options, options);
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
