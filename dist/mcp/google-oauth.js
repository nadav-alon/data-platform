import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { z } from "zod";
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const googleRefreshTokenSchema = z.string().min(1).brand();
export function isGoogleRefreshToken(value) {
    return googleRefreshTokenSchema.safeParse(value).success;
}
/** The constructor: narrows, or throws. It does not echo the value: it is a credential. */
export function googleRefreshToken(value) {
    if (!isGoogleRefreshToken(value))
        throw new Error("Not a Google refresh token: it is empty");
    return value;
}
/** Thrown when Google refuses a token request; `refreshRefused` is true for a revoked or expired refresh token. */
export class GoogleOAuthError extends Error {
    refreshRefused;
    constructor(message, refreshRefused = false) {
        super(message);
        this.refreshRefused = refreshRefused;
    }
}
const tokenResponseSchema = z.object({
    id_token: z.string().min(1),
    access_token: z.string().min(1),
    refresh_token: googleRefreshTokenSchema.optional(),
});
const base64Url = (bytes) => bytes.toString("base64url");
/**
 * The one-time sign-in: opens Google's consent page for `client` in a browser, waits for Google to
 * redirect back to a loopback port on this machine (PKCE, with a `state` check), and exchanges the
 * code for tokens. Rejects if Google reports an error or the redirect's `state` is not ours.
 */
export async function signInViaBrowser(client, deps) {
    const verifier = base64Url(randomBytes(32));
    const state = base64Url(randomBytes(16));
    const loopback = await listenOnLoopback();
    try {
        const url = new URL(AUTHORIZATION_ENDPOINT);
        url.search = new URLSearchParams({
            client_id: client.clientId,
            redirect_uri: loopback.redirectUri,
            response_type: "code",
            scope: "openid email",
            access_type: "offline",
            prompt: "consent",
            state,
            code_challenge: base64Url(createHash("sha256").update(verifier).digest()),
            code_challenge_method: "S256",
        }).toString();
        await deps.openUrl(url.toString());
        const redirect = await loopback.redirect;
        const error = redirect.get("error");
        if (error !== null)
            throw new GoogleOAuthError(`Google sign-in failed: ${error}`);
        const code = redirect.get("code");
        if (redirect.get("state") !== state || code === null) {
            throw new GoogleOAuthError("Google sign-in redirect did not match the request");
        }
        return await requestTokens(deps, client, {
            grant_type: "authorization_code",
            code,
            code_verifier: verifier,
            redirect_uri: loopback.redirectUri,
        });
    }
    finally {
        loopback.close();
    }
}
/** Trades a cached refresh token for fresh tokens. Rejects with `refreshRefused` when Google no longer honours it. */
export function refreshTokens(client, refreshToken, deps) {
    return requestTokens(deps, client, { grant_type: "refresh_token", refresh_token: refreshToken });
}
async function requestTokens(deps, client, grant) {
    const response = await deps.fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: client.clientId,
            client_secret: client.clientSecret,
            ...grant,
        }),
    });
    if (!response.ok) {
        const { error } = (await response.json().catch(() => ({})));
        throw new GoogleOAuthError(`Google refused the token request: ${error ?? response.status}`, grant.grant_type === "refresh_token" && error === "invalid_grant");
    }
    const tokens = tokenResponseSchema.parse(await response.json());
    return {
        idToken: tokens.id_token,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
    };
}
/** A one-shot HTTP server on a free loopback port that resolves with the first redirect's query. */
async function listenOnLoopback() {
    let resolveRedirect;
    const redirect = new Promise((resolve) => {
        resolveRedirect = resolve;
    });
    const server = createServer((request, response) => {
        const { searchParams } = new URL(request.url ?? "/", "http://127.0.0.1");
        if (!searchParams.has("code") && !searchParams.has("error")) {
            response.writeHead(404).end();
            return;
        }
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("Signed in. You can close this tab and return to Claude Code.");
        resolveRedirect(searchParams);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    return {
        redirectUri: `http://127.0.0.1:${port}`,
        redirect,
        close: () => server.close(),
    };
}
