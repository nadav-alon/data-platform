import type { FirebaseApp } from "firebase/app";
import { email, type Email } from "../core/email.ts";
import { uid, type Uid } from "../core/uid.ts";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

/** The Firebase Auth calls the auth client makes, injectable so a test can observe them. */
export type AuthDeps = {
  readonly getAuth: typeof getAuth;
  readonly signInWithPopup: typeof signInWithPopup;
  readonly signOut: typeof signOut;
  readonly onAuthStateChanged: typeof onAuthStateChanged;
  readonly newGoogleProvider: () => GoogleAuthProvider;
};

const AUTH_DEPS: AuthDeps = {
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  newGoogleProvider: () => new GoogleAuthProvider(),
};

/** A signed-in user: the branded uid and email. */
export type AuthUser = { readonly uid: Uid; readonly email: Email };

export type AuthClient = {
  /**
   * Opens the Google sign-in popup and resolves with the signed-in user. Rejects with Firebase's
   * error if the popup is dismissed or blocked, and with an `Error` if the user has no email.
   */
  readonly signIn: () => Promise<AuthUser>;
  /** Signs the current user out. */
  readonly signOut: () => Promise<void>;
  /**
   * Calls `listener` with the signed-in user, or `null` when signed out, now and on every change.
   * Returns the unsubscribe function. Throws if a signed-in user has no email or a bad uid.
   */
  readonly onAuthChange: (listener: (user: AuthUser | null) => void) => () => void;
  /** The signed-in user's uid, or `null` when signed out. Throws if the uid is bad. */
  readonly currentUid: () => Uid | null;
};

/**
 * The Google sign-in client for an app from `initFirebase`. Through `initFirebase(config, { local: true })`
 * the app's Auth is the local kit's, so sign-in goes through the Auth emulator's popup. The app's
 * Auth is looked up on each call, so a hand-wired local app may build the client before
 * `initLocalAuth`.
 */
export function authClient(app: FirebaseApp): AuthClient {
  return authClientWith(AUTH_DEPS, app);
}

/** `authClient` with the calls injected; `index.ts` does not export it. */
export function authClientWith(deps: AuthDeps, app: FirebaseApp): AuthClient {
  return {
    signIn: async () => {
      const credential = await deps.signInWithPopup(deps.getAuth(app), deps.newGoogleProvider());
      return toAuthUser(credential.user);
    },
    signOut: () => deps.signOut(deps.getAuth(app)),
    onAuthChange: (listener) =>
      deps.onAuthStateChanged(deps.getAuth(app), (user) =>
        listener(user === null ? null : toAuthUser(user)),
      ),
    currentUid: () => {
      const user = deps.getAuth(app).currentUser;
      return user === null ? null : uid(user.uid);
    },
  };
}

function toAuthUser(user: Pick<User, "uid" | "email">): AuthUser {
  if (user.email === null) {
    throw new Error(`Signed-in user ${user.uid} has no email`);
  }
  return { uid: uid(user.uid), email: email(user.email) };
}
