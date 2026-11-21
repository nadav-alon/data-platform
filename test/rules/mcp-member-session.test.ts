import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { googleClientId, type ServerConfig } from "../../src/mcp/config.ts";
import { readItems } from "../../src/mcp/household-reader.ts";
import { openMemberSession, type MemberSessionDeps } from "../../src/mcp/member-session.ts";
import { fakeGoogleIdToken, seedLocalHousehold } from "./mcp-client.ts";

const projectId = process.env.GCLOUD_PROJECT as string;
const [firestoreHost, firestorePort] = (process.env.FIRESTORE_EMULATOR_HOST ?? "").split(":");

const config: ServerConfig = {
  firebase: { projectId, apiKey: "fake" } as ServerConfig["firebase"],
  oauthClient: { clientId: googleClientId("1-a.apps.googleusercontent.com"), clientSecret: "shh" },
};

/** Deps whose Google is the Auth emulator's fake one: the browser signs in as `email`. */
function deps(email: string, cached?: string): MemberSessionDeps & { saved: string[]; opened: string[] } {
  const saved: string[] = [];
  const opened: string[] = [];
  const google = (grant: string) =>
    Response.json({
      id_token: fakeGoogleIdToken(email),
      access_token: "access",
      ...(grant === "authorization_code" ? { refresh_token: "refresh-from-browser" } : {}),
    });
  return {
    saved,
    opened,
    tokenCache: { load: () => cached, save: (token) => saved.push(token) },
    fetch: (async (_url: string | URL | Request, init?: RequestInit) =>
      cached === "revoked" && new URLSearchParams(String(init?.body)).get("grant_type") === "refresh_token"
        ? Response.json({ error: "invalid_grant" }, { status: 400 })
        : google(new URLSearchParams(String(init?.body)).get("grant_type") ?? "")) as typeof fetch,
    openUrl: async (url) => {
      opened.push(url);
      const authUrl = new URL(url);
      const back = new URL(authUrl.searchParams.get("redirect_uri") as string);
      back.search = new URLSearchParams({
        code: "c",
        state: authUrl.searchParams.get("state") as string,
      }).toString();
      void fetch(back);
    },
    initApp: (webConfig) => {
      const app = initializeApp(webConfig, `session-${Math.random()}`);
      connectAuthEmulator(getAuth(app), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
        disableWarnings: true,
      });
      connectFirestoreEmulator(getFirestore(app), firestoreHost ?? "", Number(firestorePort));
      return app;
    },
  };
}

test("with no cached token the browser sign-in runs once, its refresh token is cached, and reads pass as that Member", async () => {
  await seedLocalHousehold("owner-with-items");
  const d = deps("owner@example.com");

  const { db, close } = await openMemberSession(config, d);

  try {
    assert.equal(d.opened.length, 1);
    assert.deepEqual(d.saved, ["refresh-from-browser"]);
    assert.ok((await readItems(db)).length > 0);
  } finally {
    await close();
  }
});

test("a cached refresh token signs in without opening the browser", async () => {
  await seedLocalHousehold("owner-with-items");
  const d = deps("owner@example.com", "cached-refresh");

  const { db, close } = await openMemberSession(config, d);

  try {
    assert.equal(d.opened.length, 0);
    assert.deepEqual(d.saved, ["cached-refresh"]);
    assert.ok((await readItems(db)).length > 0);
  } finally {
    await close();
  }
});

test("a refresh token Google no longer honours falls back to the browser sign-in", async () => {
  await seedLocalHousehold("owner-with-items");
  const d = deps("owner@example.com", "revoked");

  const { close } = await openMemberSession(config, d);

  try {
    assert.equal(d.opened.length, 1);
    assert.deepEqual(d.saved, ["refresh-from-browser"]);
  } finally {
    await close();
  }
});

test("a signed-in Google account that is not a Member reads nothing", async () => {
  await seedLocalHousehold("owner-with-items");

  const { db, close } = await openMemberSession(config, deps("stranger@example.com"));

  try {
    await assert.rejects(readItems(db), { code: "permission-denied" });
  } finally {
    await close();
  }
});
