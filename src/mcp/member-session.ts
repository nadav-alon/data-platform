import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import type { ServerConfig } from "./config.ts";
import {
  GoogleOAuthError,
  refreshTokens,
  signInViaBrowser,
  type GoogleOAuthDeps,
  type GoogleTokens,
} from "./google-oauth.ts";
import type { TokenCache } from "./token-cache.ts";

export type MemberSessionDeps = GoogleOAuthDeps & {
  readonly tokenCache: TokenCache;
  /** Builds the Firebase app for the config; a test points it at the emulators. */
  readonly initApp?: (config: ServerConfig["firebase"]) => FirebaseApp;
  /** Called with progress the developer should see, such as that a browser sign-in is starting. */
  readonly log?: (message: string) => void;
};

/** The Household's Firestore, signed in as the developer's own Member. */
export type MemberSession = {
  readonly db: Firestore;
  /** Releases the Firebase app and its connections. */
  readonly close: () => Promise<void>;
};

/**
 * Signs in as the developer's Member: with the cached Google refresh token when there is one that
 * Google still honours, otherwise through the one-time browser sign-in, whose refresh token is
 * then cached. The Google tokens go to Firebase Auth, so every read the returned `db` makes is
 * checked by `firestore.rules` as that Member. No service account, no Admin SDK.
 */
export async function openMemberSession(
  config: ServerConfig,
  deps: MemberSessionDeps,
): Promise<MemberSession> {
  const tokens = await googleTokens(config, deps);
  if (tokens.refreshToken !== undefined) deps.tokenCache.save(tokens.refreshToken);
  const app = (deps.initApp ?? initializeApp)(config.firebase);
  await signInWithCredential(
    getAuth(app),
    GoogleAuthProvider.credential(tokens.idToken, tokens.accessToken),
  );
  return { db: getFirestore(app), close: () => deleteApp(app) };
}

async function googleTokens(config: ServerConfig, deps: MemberSessionDeps): Promise<GoogleTokens> {
  const cached = deps.tokenCache.load();
  if (cached !== undefined) {
    try {
      const refreshed = await refreshTokens(config.oauthClient, cached, deps);
      return { ...refreshed, refreshToken: refreshed.refreshToken ?? cached };
    } catch (error) {
      if (!(error instanceof GoogleOAuthError && error.refreshRefused)) throw error;
      deps.log?.("The cached Google sign-in was refused; signing in again in the browser.");
    }
  } else {
    deps.log?.("No cached Google sign-in; opening the browser to sign in.");
  }
  return signInViaBrowser(config.oauthClient, deps);
}
