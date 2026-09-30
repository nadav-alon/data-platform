import { test } from "node:test";
import assert from "node:assert/strict";
import { email } from "./email.ts";
import { INVITES_COLLECTION, inviteDocPath, inviteSchema } from "./invites.ts";

const validInvite = { invitedAt: { seconds: 1_700_000_000, nanoseconds: 0 } };

test("collection name", () => {
  assert.equal(INVITES_COLLECTION, "invites");
});

test("doc path is keyed by the lowercased email", () => {
  assert.equal(inviteDocPath(email("Guest@Example.COM")), "invites/guest@example.com");
});

test("accepts a valid invite", () => {
  assert.equal(inviteSchema.safeParse(validInvite).success, true);
});

test("rejects a missing invitedAt", () => {
  assert.equal(inviteSchema.safeParse({}).success, false);
});

test("rejects a malformed invitedAt", () => {
  assert.equal(inviteSchema.safeParse({ invitedAt: "yesterday" }).success, false);
});
