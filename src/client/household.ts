import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from "firebase/firestore";
import { HOUSEHOLD_DOC_PATH } from "../core/household.ts";
import { memberDocPath } from "../core/members.ts";
import type { Uid } from "../core/uid.ts";

/** The Firestore calls the household functions make, injectable so a test can observe them. */
export type HouseholdDeps = {
  readonly doc: typeof doc;
  readonly getDoc: typeof getDoc;
  readonly serverTimestamp: typeof serverTimestamp;
  readonly writeBatch: typeof writeBatch;
};

const HOUSEHOLD_DEPS: HouseholdDeps = { doc, getDoc, serverTimestamp, writeBatch };

/** Whether this Household's `meta/household` has been claimed by anyone yet. */
export function householdExists(db: Firestore): Promise<boolean> {
  return householdExistsWith(HOUSEHOLD_DEPS, db);
}

/** `householdExists` with the calls injected; `index.ts` does not export it. */
export async function householdExistsWith(deps: HouseholdDeps, db: Firestore): Promise<boolean> {
  return (await deps.getDoc(deps.doc(db, HOUSEHOLD_DOC_PATH))).exists();
}

/** Whether `uid` is recorded as a Member: their `members/{uid}` doc exists. */
export function isHouseholdMember(db: Firestore, uid: Uid): Promise<boolean> {
  return isHouseholdMemberWith(HOUSEHOLD_DEPS, db, uid);
}

/** `isHouseholdMember` with the calls injected; `index.ts` does not export it. */
export async function isHouseholdMemberWith(
  deps: HouseholdDeps,
  db: Firestore,
  uid: Uid,
): Promise<boolean> {
  return (await deps.getDoc(deps.doc(db, memberDocPath(uid)))).exists();
}
