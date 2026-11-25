import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleOAuthError, refreshTokens, signInViaBrowser, } from "./google-oauth.js";
/**
 * Signs in as the developer's Member: with the cached Google refresh token when there is one that
 * Google still honours, otherwise through the one-time browser sign-in, whose refresh token is
 * then cached. The Google tokens go to Firebase Auth, so every read the returned `db` makes is
 * checked by `firestore.rules` as that Member. No service account, no Admin SDK.
 */
export async function openMemberSession(config, deps) {
    const tokens = await googleTokens(config, deps);
    if (tokens.refreshToken !== undefined)
        deps.tokenCache.save(tokens.refreshToken);
    const app = (deps.initApp ?? initializeApp)(config.firebase);
    await signInWithCredential(getAuth(app), GoogleAuthProvider.credential(tokens.idToken, tokens.accessToken));
    return { db: getFirestore(app), close: () => deleteApp(app) };
}
async function googleTokens(config, deps) {
    const cached = deps.tokenCache.load();
    if (cached !== undefined) {
        try {
            const refreshed = await refreshTokens(config.oauthClient, cached, deps);
            return { ...refreshed, refreshToken: refreshed.refreshToken ?? cached };
        }
        catch (error) {
            if (!(error instanceof GoogleOAuthError && error.refreshRefused))
                throw error;
            deps.log?.("The cached Google sign-in was refused; signing in again in the browser.");
        }
    }
    else {
        deps.log?.("No cached Google sign-in; opening the browser to sign in.");
    }
    return signInViaBrowser(config.oauthClient, deps);
}
