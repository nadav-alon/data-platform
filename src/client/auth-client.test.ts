import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider, User } from "firebase/auth";
import { authClientWith, type AuthDeps } from "./auth-client.ts";

function fakeDeps(overrides: Partial<AuthDeps> = {}) {
  const app = { name: "the app" } as FirebaseApp;
  const auth = { name: "the auth", currentUser: null } as unknown as Auth;
  const provider = { providerId: "google.com" } as GoogleAuthProvider;
  const unsubscribe = () => {};
  const calls = {
    authApps: [] as FirebaseApp[],
    signedOut: [] as Auth[],
    watched: [] as { auth: Auth; next: (user: User | null) => void }[],
    popups: [] as { auth: Auth; provider: unknown }[],
  };
  const deps: AuthDeps = {
    getAuth: (a) => {
      calls.authApps.push(a);
      return auth;
    },
    signInWithPopup: (async (a: Auth, p: unknown) => {
      calls.popups.push({ auth: a, provider: p });
      return {};
    }) as unknown as AuthDeps["signInWithPopup"],
    signOut: async (a) => {
      calls.signedOut.push(a);
    },
    onAuthStateChanged: (a, next) => {
      calls.watched.push({ auth: a, next });
      return unsubscribe;
    },
    newGoogleProvider: () => provider,
    ...overrides,
  };
  return { app, auth, provider, unsubscribe, calls, deps };
}

test("signIn opens the Google popup on the app's Auth", async () => {
  const { app, auth, provider, calls, deps } = fakeDeps();

  await authClientWith(deps, app).signIn();

  assert.deepEqual(calls.authApps, [app]);
  assert.equal(calls.popups.length, 1);
  assert.equal(calls.popups[0]?.auth, auth);
  assert.equal(calls.popups[0]?.provider, provider);
});

test("signIn rejects when the popup does", async () => {
  const { app, deps } = fakeDeps({
    signInWithPopup: (async () => {
      throw new Error("auth/popup-closed-by-user");
    }) as unknown as AuthDeps["signInWithPopup"],
  });

  await assert.rejects(authClientWith(deps, app).signIn(), /popup-closed-by-user/);
});

test("signOut signs the app's Auth out", async () => {
  const { app, auth, calls, deps } = fakeDeps();

  await authClientWith(deps, app).signOut();

  assert.deepEqual(calls.signedOut, [auth]);
});

test("onAuthChange reports the signed-in uid, then null on sign-out, and returns the unsubscribe", () => {
  const { app, auth, unsubscribe, calls, deps } = fakeDeps();
  const seen: (string | null)[] = [];

  const stop = authClientWith(deps, app).onAuthChange((uid) => seen.push(uid));

  assert.equal(stop, unsubscribe);
  assert.equal(calls.watched[0]?.auth, auth);
  calls.watched[0]?.next({ uid: "abc" } as User);
  calls.watched[0]?.next(null);
  assert.deepEqual(seen, ["abc", null]);
});

test("currentUid is the signed-in user's uid, or null when signed out", () => {
  const { app, auth, deps } = fakeDeps();
  const client = authClientWith(deps, app);

  assert.equal(client.currentUid(), null);
  (auth as { currentUser: User | null }).currentUser = { uid: "abc" } as User;
  assert.equal(client.currentUid(), "abc");
});
