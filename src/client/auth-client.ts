import type { FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";

/** The Firebase Auth calls the auth client makes, injectable so a test can observe them. */
export type AuthDeps = {
  readonly getAuth: (app: FirebaseApp) => Auth;
  readonly signInWithPopup: typeof signInWithPopup;
  readonly signOut: (auth: Auth) => Promise<void>;
  readonly newGoogleProvider: () => GoogleAuthProvider;
};

const AUTH_DEPS: AuthDeps = {
  getAuth,
  signInWithPopup,
  signOut,
  newGoogleProvider: () => new GoogleAuthProvider(),
};

export type AuthClient = {
  /** Opens the Google sign-in popup. Rejects with Firebase's error if the popup is dismissed or blocked. */
  readonly signIn: () => Promise<void>;
  /** Signs the current user out. */
  readonly signOut: () => Promise<void>;
};

/**
 * The Google sign-in client for an app from `initFirebase`. Through `initFirebase(config, { local: true })`
 * the app's Auth is the local kit's, so sign-in goes through the Auth emulator's popup.
 */
export function authClient(app: FirebaseApp): AuthClient {
  return authClientWith(AUTH_DEPS, app);
}

/** `authClient` with the calls injected; `index.ts` does not export it. */
export function authClientWith(deps: AuthDeps, app: FirebaseApp): AuthClient {
  const auth = deps.getAuth(app);
  return {
    signIn: async () => {
      await deps.signInWithPopup(auth, deps.newGoogleProvider());
    },
    signOut: () => deps.signOut(auth),
  };
}
