import { type FirebaseApp } from "firebase/app";
import { type Firestore } from "firebase/firestore";
import type { ServerConfig } from "./config.ts";
import { type GoogleOAuthDeps } from "./google-oauth.ts";
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
export declare function openMemberSession(config: ServerConfig, deps: MemberSessionDeps): Promise<MemberSession>;
