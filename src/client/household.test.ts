import { test } from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase/firestore";
import { email } from "../core/email.ts";
import { uid } from "../core/uid.ts";
import {
  claimHouseholdWith,
  householdExistsWith,
  isHouseholdMemberWith,
  type HouseholdDeps,
} from "./household.ts";

const db = { name: "fake-db" } as unknown as Firestore;
const alice = uid("alice");

type FakeRef = { readonly path: string };

/** Deps whose reads report `exists` and whose `doc` records the paths it was asked for. */
function fakeReads(exists: boolean) {
  const paths: string[] = [];
  const deps = {
    doc: ((_db: Firestore, path: string): FakeRef => {
      paths.push(path);
      return { path };
    }) as unknown as HouseholdDeps["doc"],
    getDoc: (async () => ({ exists: () => exists })) as unknown as HouseholdDeps["getDoc"],
  } as HouseholdDeps;
  return { deps, paths };
}

test("householdExists reads meta/household", async () => {
  const { deps, paths } = fakeReads(true);
  assert.equal(await householdExistsWith(deps, db), true);
  assert.deepEqual(paths, ["meta/household"]);
});

test("householdExists is false when nothing has claimed it yet", async () => {
  assert.equal(await householdExistsWith(fakeReads(false).deps, db), false);
});

test("isHouseholdMember reads the members doc for the uid", async () => {
  const { deps, paths } = fakeReads(true);
  assert.equal(await isHouseholdMemberWith(deps, db, alice), true);
  assert.deepEqual(paths, ["members/alice"]);
});

test("isHouseholdMember is false for a non-member", async () => {
  assert.equal(await isHouseholdMemberWith(fakeReads(false).deps, db, alice), false);
});

const STAMP = { kind: "server-timestamp" };

/** Deps whose batch records every `set` and `delete`, and whose `commit` is `commit`. */
function fakeBatch(commit: () => Promise<void> = async () => {}) {
  const sets: { path: string; data: unknown }[] = [];
  const deletes: string[] = [];
  const batches: Firestore[] = [];
  const deps = {
    doc: ((_db: Firestore, path: string): FakeRef => ({ path })) as unknown as HouseholdDeps["doc"],
    serverTimestamp: (() => STAMP) as unknown as HouseholdDeps["serverTimestamp"],
    writeBatch: ((target: Firestore) => {
      batches.push(target);
      return {
        set: (ref: FakeRef, data: unknown) => void sets.push({ path: ref.path, data }),
        delete: (ref: FakeRef) => void deletes.push(ref.path),
        commit,
      };
    }) as unknown as HouseholdDeps["writeBatch"],
  } as HouseholdDeps;
  return { deps, sets, deletes, batches };
}

test("claimHousehold writes meta/household and the members doc in one batch", async () => {
  let commits = 0;
  const { deps, sets, batches } = fakeBatch(async () => void commits++);

  await claimHouseholdWith(deps, db, alice, email("owner@example.com"));

  assert.deepEqual(batches, [db]);
  assert.deepEqual(sets, [
    { path: "meta/household", data: { owner: alice } },
    { path: "members/alice", data: { email: "owner@example.com", addedAt: STAMP } },
  ]);
  assert.equal(commits, 1);
});

test("claimHousehold records the email lowercased", async () => {
  const { deps, sets } = fakeBatch();
  await claimHouseholdWith(deps, db, alice, email("Owner@Example.com"));
  assert.deepEqual(sets[1]?.data, { email: "owner@example.com", addedAt: STAMP });
});
