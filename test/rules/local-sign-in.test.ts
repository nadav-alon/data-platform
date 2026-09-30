import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSucceeds } from "@firebase/rules-unit-testing";
import { withEmulatorWriter } from "../../src/local/admin-writer.ts";
import { seedAuthUsers } from "../../src/local/auth-users.ts";
import { SCENARIOS, seedScenario, type ScenarioName } from "../../src/local/scenarios.ts";
import { setupRulesTestEnv } from "./test-env.ts";

const ref = setupRulesTestEnv();

const projectId = process.env.GCLOUD_PROJECT;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;

/** What the Auth emulator's fake Google popup does: sign in by a Google id token for `email`. */
async function fakeGoogleSignIn(email: string): Promise<{ localId: string; idToken: string }> {
  const idToken = JSON.stringify({ sub: `google-${email}`, email, email_verified: true });
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
        requestUri: "http://localhost",
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    },
  );
  const body = await response.text();
  assert.ok(response.ok, body);
  return JSON.parse(body) as { localId: string; idToken: string };
}

for (const name of ["owner-with-items", "invited-member"] as const satisfies ScenarioName[]) {
  test(`fake Google sign-in in the ${name} scenario yields the seeded ${SCENARIOS[name].users[0]?.role}`, async () => {
    assert.ok(authHost, "run this suite through `npm run test:rules`");
    const [user] = SCENARIOS[name].users;
    assert.ok(user);
    await fetch(`http://${authHost}/emulator/v1/projects/${projectId}/accounts`, { method: "DELETE" });

    await seedAuthUsers(SCENARIOS[name].users, { projectId, host: authHost });
    const signedIn = await fakeGoogleSignIn(user.email);

    assert.equal(signedIn.localId, user.uid);
    const db = ref.env.authenticatedContext(signedIn.localId, { email: user.email }).firestore();
    await withEmulatorWriter((writer) => seedScenario(writer, name), {
      projectId,
      host: firestoreHost,
    });
    let householdOwner: unknown;
    await ref.env.withSecurityRulesDisabled(async (context) => {
      householdOwner = (await context.firestore().doc("meta/household").get()).get("owner");
    });
    assert.equal(householdOwner === signedIn.localId, user.role === "owner");
    await assertSucceeds(db.doc("items/dishSoap").get());
  });
}
