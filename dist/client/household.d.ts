import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from "firebase/firestore";
import { type Email } from "../core/email.ts";
import type { Uid } from "../core/uid.ts";
/** The Firestore calls the household functions make, injectable so a test can observe them. */
export type HouseholdDeps = {
    readonly doc: typeof doc;
    readonly getDoc: typeof getDoc;
    readonly serverTimestamp: typeof serverTimestamp;
    readonly writeBatch: typeof writeBatch;
};
/** Whether this Household's `meta/household` has been claimed by anyone yet. */
export declare function householdExists(db: Firestore): Promise<boolean>;
/** `householdExists` with the calls injected; `index.ts` does not export it. */
export declare function householdExistsWith(deps: HouseholdDeps, db: Firestore): Promise<boolean>;
/** Whether `uid` is recorded as a Member: their `members/{uid}` doc exists. */
export declare function isHouseholdMember(db: Firestore, uid: Uid): Promise<boolean>;
/** `isHouseholdMember` with the calls injected; `index.ts` does not export it. */
export declare function isHouseholdMemberWith(deps: HouseholdDeps, db: Firestore, uid: Uid): Promise<boolean>;
/** First-claim: writes `meta/household` and the claimant's `members/{uid}` doc in one batch. */
export declare function claimHousehold(db: Firestore, uid: Uid, email: Email): Promise<void>;
/** `claimHousehold` with the calls injected; `index.ts` does not export it. */
export declare function claimHouseholdWith(deps: HouseholdDeps, db: Firestore, uid: Uid, email: Email): Promise<void>;
/**
 * Turns the Invite addressed to `email` into Membership: one batch creates `members/{uid}` and
 * deletes the Invite. Resolves `false` when there is no Invite, or when the rules refuse the join
 * (for example the Invite was revoked in the meantime); any other failure rejects.
 */
export declare function joinFromInvite(db: Firestore, uid: Uid, email: Email): Promise<boolean>;
/** `joinFromInvite` with the calls injected; `index.ts` does not export it. */
export declare function joinFromInviteWith(deps: HouseholdDeps, db: Firestore, uid: Uid, email: Email): Promise<boolean>;
