import { test } from "node:test";
import assert from "node:assert/strict";
import { MEMBERS_COLLECTION, memberSchema } from "./members.ts";

const validMember = {
  email: "owner@example.com",
  addedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
};

test("collection name", () => {
  assert.equal(MEMBERS_COLLECTION, "members");
});

test("accepts a valid member", () => {
  assert.equal(memberSchema.safeParse(validMember).success, true);
});

test("tolerates unknown fields", () => {
  const result = memberSchema.safeParse({ ...validMember, role: "owner" });
  assert.equal(result.success, true);
  assert.equal("role" in (result.success ? result.data : {}), false);
});

test("rejects a missing email", () => {
  const { email, ...rest } = validMember;
  assert.equal(memberSchema.safeParse(rest).success, false);
});

test("rejects a malformed email", () => {
  assert.equal(
    memberSchema.safeParse({ ...validMember, email: "not-an-email" }).success,
    false,
  );
});

test("rejects a missing addedAt", () => {
  const { addedAt, ...rest } = validMember;
  assert.equal(memberSchema.safeParse(rest).success, false);
});
