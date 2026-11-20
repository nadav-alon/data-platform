import { test } from "node:test";
import assert from "node:assert/strict";
import type { Firestore } from "firebase/firestore";
import { uid } from "../core/uid.ts";
import {
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
