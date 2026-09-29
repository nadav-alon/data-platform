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
    writeMeta: async () => {
      calls.push("writeMeta");
    },
  });
  assert.deepEqual(calls, ["checkCredential", "deployRules", "writeMeta"]);
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
      writeMeta: async () => {
        calls.push("writeMeta");
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
      writeMeta: async () => {
        calls.push("writeMeta");
      },
    }),
    /403/,
  );
  assert.deepEqual(calls, []);
});
