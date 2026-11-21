import { test } from "node:test";
import assert from "node:assert/strict";
import { initFirebaseWith } from "../client/init-firebase.ts";
import { fakeDeps } from "../client/fake-deps.test-support.ts";
import { isFirebaseWebConfig } from "../client/web-config.ts";
import { LOCAL_PROJECT_ID } from "./emulator-config.ts";
import { LOCAL_WEB_CONFIG } from "./local-web-config.ts";

test("LOCAL_WEB_CONFIG is a web config for LOCAL_PROJECT_ID", () => {
  assert.equal(isFirebaseWebConfig(LOCAL_WEB_CONFIG), true);
  assert.equal(LOCAL_WEB_CONFIG.projectId, LOCAL_PROJECT_ID);
});

// The fake kit enforces connectLocal's project-ID guard against the app initFirebaseWith built.
function guardedKit(fake: ReturnType<typeof fakeDeps>) {
  return {
    ...fake.kit,
    connectLocal: (a: typeof fake.app) => {
      assert.equal(a.options.projectId, LOCAL_PROJECT_ID);
      fake.kit.connectLocal(a);
    },
  };
}

test("initFirebase in local mode accepts LOCAL_WEB_CONFIG", () => {
  const fake = fakeDeps();

  initFirebaseWith(fake.deps, LOCAL_WEB_CONFIG, { local: guardedKit(fake) });

  assert.deepEqual(fake.calls.connected, [fake.app]);
});

test("the guard rejects a config for any other project", () => {
  const fake = fakeDeps();

  assert.throws(() =>
    initFirebaseWith(fake.deps, { ...LOCAL_WEB_CONFIG, projectId: "anything" }, { local: guardedKit(fake) }),
  );
});
