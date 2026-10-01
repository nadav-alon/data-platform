import { test } from "node:test";
import assert from "node:assert/strict";
import type { FirebaseApp } from "firebase/app";
import type { Auth, Dependencies } from "firebase/auth";
import { browserPopupRedirectResolver, inMemoryPersistence } from "firebase/auth";
import { initLocalAuth } from "./init-local-auth.ts";

test("initLocalAuth initializes Auth with in-memory persistence and the browser popup resolver", () => {
  const app = { name: "init-local-auth" } as FirebaseApp;
  const auth = { name: "the auth" } as unknown as Auth;
  const calls: { app: FirebaseApp; deps: Dependencies | undefined }[] = [];

  const result = initLocalAuth(app, (a, deps) => {
    calls.push({ app: a, deps });
    return auth;
  });

  assert.equal(result, auth);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.app, app);
  assert.equal(calls[0]?.deps?.persistence, inMemoryPersistence);
  assert.equal(calls[0]?.deps?.popupRedirectResolver, browserPopupRedirectResolver);
});
