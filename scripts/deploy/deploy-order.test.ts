import { test } from "node:test";
import assert from "node:assert/strict";
import { runDeploy } from "./deploy-order.ts";

test("checks the credential, then deploys rules, then writes meta, in that order", async () => {
  const calls: string[] = [];
  await runDeploy({
    checkCredential: async () => {
      calls.push("checkCredential");
    },
    deployRules: () => {
      calls.push("deployRules");
    },
    writePlatformMeta: async () => {
      calls.push("writePlatformMeta");
    },
  });
  assert.deepEqual(calls, ["checkCredential", "deployRules", "writePlatformMeta"]);
});

test("never deploys rules or writes meta when the credential check fails", async () => {
  const calls: string[] = [];
  await assert.rejects(
    runDeploy({
      checkCredential: async () => {
        throw new Error("bad credentials");
      },
      deployRules: () => {
        calls.push("deployRules");
      },
      writePlatformMeta: async () => {
        calls.push("writePlatformMeta");
      },
    }),
    /bad credentials/,
  );
  assert.deepEqual(calls, []);
});

test("never writes meta when the rules deploy fails", async () => {
  const calls: string[] = [];
  await assert.rejects(
    runDeploy({
      checkCredential: async () => {},
      deployRules: () => {
        throw new Error("403 caller does not have permission");
      },
      writePlatformMeta: async () => {
        calls.push("writePlatformMeta");
      },
    }),
    /403/,
  );
  assert.deepEqual(calls, []);
});
