import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider, User } from "firebase/auth";
import { authClientWith, type AuthDeps } from "./auth-client.ts";

/** A `signInWithPopup` fake; the cast stands in for the real function's overloaded signature. */
function fakePopup(fn: (auth: Auth, provider: unknown) => Promise<unknown>) {
  return fn as unknown as AuthDeps["signInWithPopup"];
}

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
    getAuth: ((a: FirebaseApp) => {
      calls.authApps.push(a);
      return auth;
    }) as AuthDeps["getAuth"],
    signInWithPopup: fakePopup(async (a, p) => {
      calls.popups.push({ auth: a, provider: p });
      return { user: { uid: "abc", email: "me@example.com" } };
    }),
    signOut: (async (a: Auth) => {
      calls.signedOut.push(a);
    }) as AuthDeps["signOut"],
    onAuthStateChanged: ((a: Auth, next: (user: User | null) => void) => {
      calls.watched.push({ auth: a, next });
      return unsubscribe;
    }) as unknown as AuthDeps["onAuthStateChanged"],
    newGoogleProvider: () => provider,
    ...overrides,
  };
  return { app, auth, provider, unsubscribe, calls, deps };
}

test("signIn opens the Google popup on the app's Auth and resolves with the signed-in user", async () => {
  const { app, auth, provider, calls, deps } = fakeDeps();

  const user = await authClientWith(deps, app).signIn();

  assert.deepEqual(calls.authApps, [app]);
  assert.equal(calls.popups.length, 1);
  assert.equal(calls.popups[0]?.auth, auth);
  assert.equal(calls.popups[0]?.provider, provider);
  assert.deepEqual(user, { uid: "abc", email: "me@example.com" });
});

test("signIn rejects when the popup does", async () => {
  const { app, deps } = fakeDeps({
    signInWithPopup: fakePopup(async () => {
      throw new Error("auth/popup-closed-by-user");
    }),
  });

  await assert.rejects(authClientWith(deps, app).signIn(), /popup-closed-by-user/);
});

test("signIn rejects a signed-in user with no email", async () => {
  const { app, deps } = fakeDeps({
    signInWithPopup: fakePopup(async () => ({ user: { uid: "abc", email: null } })),
  });

  await assert.rejects(authClientWith(deps, app).signIn(), /abc has no email/);
});

test("building the client does not look up the Auth", () => {
  const { app, calls, deps } = fakeDeps();

  authClientWith(deps, app);

  assert.deepEqual(calls.authApps, []);
});

test("signOut signs the app's Auth out", async () => {
  const { app, auth, calls, deps } = fakeDeps();

  await authClientWith(deps, app).signOut();

  assert.deepEqual(calls.signedOut, [auth]);
});

test("onAuthChange reports the signed-in user, then null on sign-out, and returns the unsubscribe", () => {
  const { app, auth, unsubscribe, calls, deps } = fakeDeps();
  const seen: unknown[] = [];

  const stop = authClientWith(deps, app).onAuthChange((user) => seen.push(user));

  assert.equal(stop, unsubscribe);
  assert.equal(calls.watched[0]?.auth, auth);
  calls.watched[0]?.next({ uid: "abc", email: "me@example.com" } as User);
  calls.watched[0]?.next(null);
  assert.deepEqual(seen, [{ uid: "abc", email: "me@example.com" }, null]);
});

test("onAuthChange throws for a signed-in user with no email, rather than reporting signed out", () => {
  const { app, calls, deps } = fakeDeps();
  authClientWith(deps, app).onAuthChange(() => {});

  assert.throws(() => calls.watched[0]?.next({ uid: "abc", email: null } as User), /abc has no email/);
});

test("currentUid is the signed-in user's uid, or null when signed out", () => {
  const { app, auth, deps } = fakeDeps();
  const client = authClientWith(deps, app);

  assert.equal(client.currentUid(), null);
  (auth as { currentUser: User | null }).currentUser = { uid: "abc" } as User;
  assert.equal(client.currentUid(), "abc");
});

test("currentUid throws for a bad uid, rather than reporting signed out", () => {
  const { app, auth, deps } = fakeDeps();
  (auth as { currentUser: User | null }).currentUser = { uid: "" } as User;

  assert.throws(() => authClientWith(deps, app).currentUid(), /Not a Uid/);
});
