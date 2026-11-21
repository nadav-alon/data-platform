import { test } from "node:test";
import assert from "node:assert/strict";
import { readServerConfig, ServerConfigError } from "./config.ts";

const firebase = {
  apiKey: "key",
  authDomain: "household.firebaseapp.com",
  projectId: "household",
  storageBucket: "household.appspot.com",
  messagingSenderId: "1",
  appId: "1:1:web:a",
};
const oauthClient = { clientId: "123-abc.apps.googleusercontent.com", clientSecret: "shh" };
const valid = JSON.stringify({ firebase, oauthClient });

test("the config is read from config.json in the config dir", () => {
  let readPath = "";
  const config = readServerConfig({ DATA_PLATFORM_MCP_DIR: "/cfg" }, (path) => {
    readPath = path;
    return valid;
  });

  assert.equal(readPath, "/cfg/config.json");
  assert.deepEqual(config, { firebase, oauthClient });
});

test("DATA_PLATFORM_MCP_CONFIG_JSON takes precedence over the file", () => {
  const config = readServerConfig({ DATA_PLATFORM_MCP_CONFIG_JSON: valid }, () => {
    throw new Error("must not read the file");
  });

  assert.equal(config.firebase.projectId, "household");
});

test("a missing config names where it was looked for", () => {
  const missing = Object.assign(new Error("nope"), { code: "ENOENT" });
  assert.throws(
    () =>
      readServerConfig({ DATA_PLATFORM_MCP_DIR: "/cfg" }, () => {
        throw missing;
      }),
    (error: Error) =>
      error instanceof ServerConfigError &&
      error.message.includes("/cfg/config.json") &&
      error.message.includes("DATA_PLATFORM_MCP_CONFIG_JSON"),
  );
});

test("a malformed config names the bad fields but never the secret", () => {
  const bad = JSON.stringify({
    firebase,
    oauthClient: { clientId: "not-a-client-id", clientSecret: "shh-secret" },
  });
  assert.throws(
    () => readServerConfig({ DATA_PLATFORM_MCP_CONFIG_JSON: bad }),
    (error: Error) =>
      error instanceof ServerConfigError &&
      error.message.includes("oauthClient.clientId") &&
      !error.message.includes("shh-secret"),
  );
  assert.throws(() => readServerConfig({ DATA_PLATFORM_MCP_CONFIG_JSON: "{" }), ServerConfigError);
});

test("an incomplete Firebase web config is rejected", () => {
  const bad = JSON.stringify({ firebase: { ...firebase, appId: "" }, oauthClient });
  assert.throws(() => readServerConfig({ DATA_PLATFORM_MCP_CONFIG_JSON: bad }), /appId/);
});
