import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider } from "firebase/auth";
import { authClientWith, type AuthDeps } from "./auth-client.ts";

function fakeDeps(overrides: Partial<AuthDeps> = {}) {
  const app = { name: "the app" } as FirebaseApp;
  const auth = { name: "the auth" } as unknown as Auth;
  const provider = { providerId: "google.com" } as GoogleAuthProvider;
  const calls = {
    authApps: [] as FirebaseApp[],
    signedOut: [] as Auth[],
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
    newGoogleProvider: () => provider,
    ...overrides,
  };
  return { app, auth, provider, calls, deps };
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
