import { z } from "zod";
import type { OAuthClient } from "./config.ts";
declare const googleRefreshTokenSchema: z.core.$ZodBranded<z.ZodString, "GoogleRefreshToken", "out">;
/** A Google refresh token: opaque, so the guard only checks that it is not empty. */
export type GoogleRefreshToken = z.infer<typeof googleRefreshTokenSchema>;
export declare function isGoogleRefreshToken(value: string): value is GoogleRefreshToken;
/** The constructor: narrows, or throws. It does not echo the value: it is a credential. */
export declare function googleRefreshToken(value: string): GoogleRefreshToken;
/** What Google returns for a sign-in; `refreshToken` is what the cache keeps. */
export type GoogleTokens = {
    readonly idToken: string;
    readonly accessToken: string;
    readonly refreshToken: GoogleRefreshToken | undefined;
};
/** Thrown when Google refuses a token request; `refreshRefused` is true for a revoked or expired refresh token. */
export declare class GoogleOAuthError extends Error {
    readonly refreshRefused: boolean;
    constructor(message: string, refreshRefused?: boolean);
}
/** The calls the sign-in makes, injectable so a test needs neither a browser nor Google. */
export type GoogleOAuthDeps = {
    readonly fetch: typeof fetch;
    /** Sends the developer to `url` in a browser. */
    readonly openUrl: (url: string) => void | Promise<void>;
};
/**
 * The one-time sign-in: opens Google's consent page for `client` in a browser, waits for Google to
 * redirect back to a loopback port on this machine (PKCE, with a `state` check), and exchanges the
 * code for tokens. Rejects if Google reports an error or the redirect's `state` is not ours.
 */
export declare function signInViaBrowser(client: OAuthClient, deps: GoogleOAuthDeps): Promise<GoogleTokens>;
/** Trades a cached refresh token for fresh tokens. Rejects with `refreshRefused` when Google no longer honours it. */
export declare function refreshTokens(client: OAuthClient, refreshToken: GoogleRefreshToken, deps: Pick<GoogleOAuthDeps, "fetch">): Promise<GoogleTokens>;
export {};
