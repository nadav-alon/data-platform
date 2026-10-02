import { test } from "node:test";
import assert from "node:assert/strict";
import { isServiceAccountEmail, serviceAccountEmail } from "./service-account-email.ts";

const email = "firebase-adminsdk-abc12@my-household-42.iam.gserviceaccount.com";

test("accepts a service account email", () => {
  assert.equal(isServiceAccountEmail(email), true);
  assert.equal(serviceAccountEmail(email), email);
});

test("rejects a person's email", () => {
  assert.equal(isServiceAccountEmail("user@example.com"), false);
  assert.throws(() => serviceAccountEmail("user@example.com"), /Not a service account email/);
});
