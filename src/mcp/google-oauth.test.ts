import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { googleClientId } from "./config.ts";
import {
  GoogleOAuthError,
  googleRefreshToken,
  refreshTokens,
  signInViaBrowser,
} from "./google-oauth.ts";

const client = { clientId: googleClientId("1-a.apps.googleusercontent.com"), clientSecret: "shh" };

const tokenBody = { id_token: "id", access_token: "access", refresh_token: "refresh" };

/** A token endpoint that records its form bodies and answers with `reply`. */
function fakeTokenEndpoint(reply: () => Response) {
  const bodies: URLSearchParams[] = [];
  const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(new URLSearchParams(String(init?.body)));
    return reply();
  }) as typeof fetch;
  return { bodies, fetcher };
}

/** A "browser" that follows Google's redirect straight back to the loopback URI, with `override`s. */
function browserReturning(override: Record<string, string> = {}, seen: URL[] = []) {
  return async (authUrl: string) => {
    const url = new URL(authUrl);
    seen.push(url);
    const back = new URL(url.searchParams.get("redirect_uri") as string);
    back.search = new URLSearchParams({
      code: "the-code",
      state: url.searchParams.get("state") as string,
      ...override,
    }).toString();
    void fetch(back);
  };
}

test("sign-in sends PKCE and offline access, then exchanges the code for tokens", async () => {
  const endpoint = fakeTokenEndpoint(() => Response.json(tokenBody));
  const seen: URL[] = [];

  const tokens = await signInViaBrowser(client, {
    fetch: endpoint.fetcher,
    openUrl: browserReturning({}, seen),
  });

  assert.deepEqual(tokens, { idToken: "id", accessToken: "access", refreshToken: "refresh" });
  const [auth] = seen;
  assert.equal(auth?.searchParams.get("client_id"), client.clientId);
  assert.equal(auth?.searchParams.get("access_type"), "offline");
  assert.match(auth?.searchParams.get("redirect_uri") ?? "", /^http:\/\/127\.0\.0\.1:\d+$/);
  const [exchange] = endpoint.bodies;
  assert.equal(exchange?.get("code"), "the-code");
  assert.equal(exchange?.get("client_secret"), "shh");
  assert.equal(exchange?.get("redirect_uri"), auth?.searchParams.get("redirect_uri"));
  assert.equal(
    createHash("sha256")
      .update(exchange?.get("code_verifier") ?? "")
      .digest("base64url"),
    auth?.searchParams.get("code_challenge"),
  );
});

test("a redirect with another state is rejected without asking for tokens", async () => {
  const endpoint = fakeTokenEndpoint(() => Response.json(tokenBody));

  await assert.rejects(
    signInViaBrowser(client, {
      fetch: endpoint.fetcher,
      openUrl: browserReturning({ state: "forged" }),
    }),
    GoogleOAuthError,
  );
  assert.equal(endpoint.bodies.length, 0);
});

test("a consent the developer declines is rejected naming Google's error", async () => {
  const endpoint = fakeTokenEndpoint(() => Response.json(tokenBody));

  await assert.rejects(
    signInViaBrowser(client, {
      fetch: endpoint.fetcher,
      openUrl: browserReturning({ error: "access_denied" }),
    }),
    /access_denied/,
  );
});

test("refreshTokens trades a refresh token, and flags one Google no longer honours", async () => {
  const ok = fakeTokenEndpoint(() => Response.json({ id_token: "id2", access_token: "access2" }));
  assert.deepEqual(
    await refreshTokens(client, googleRefreshToken("refresh"), { fetch: ok.fetcher }),
    {
      idToken: "id2",
      accessToken: "access2",
      refreshToken: undefined,
    },
  );
  assert.equal(ok.bodies[0]?.get("grant_type"), "refresh_token");
  assert.equal(ok.bodies[0]?.get("refresh_token"), "refresh");

  const revoked = fakeTokenEndpoint(() =>
    Response.json({ error: "invalid_grant" }, { status: 400 }),
  );
  await assert.rejects(
    refreshTokens(client, googleRefreshToken("refresh"), { fetch: revoked.fetcher }),
    (error: unknown) => error instanceof GoogleOAuthError && error.refreshRefused,
  );
});
