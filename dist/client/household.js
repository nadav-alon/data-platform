import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { lowercasedEmail } from "../core/email.js";
import { inviteDocPath } from "../core/invites.js";
import { HOUSEHOLD_DOC_PATH } from "../core/household.js";
import { memberDocPath } from "../core/members.js";
import { isRulesRefusal } from "./rules-refusal.js";
const HOUSEHOLD_DEPS = { doc, getDoc, serverTimestamp, writeBatch };
/** Whether the doc at `path` exists. */
async function docExists(deps, db, path) {
    return (await deps.getDoc(deps.doc(db, path))).exists();
}
/** Whether this Household's `meta/household` has been claimed by anyone yet. */
export function householdExists(db) {
    return householdExistsWith(HOUSEHOLD_DEPS, db);
}
/** `householdExists` with the calls injected; `index.ts` does not export it. */
export async function householdExistsWith(deps, db) {
    return docExists(deps, db, HOUSEHOLD_DOC_PATH);
}
/** Whether `uid` is recorded as a Member: their `members/{uid}` doc exists. */
export function isHouseholdMember(db, uid) {
    return isHouseholdMemberWith(HOUSEHOLD_DEPS, db, uid);
}
/** `isHouseholdMember` with the calls injected; `index.ts` does not export it. */
export async function isHouseholdMemberWith(deps, db, uid) {
    return docExists(deps, db, memberDocPath(uid));
}
/**
 * The Member doc's shape, shared by every writer of `members/{uid}`. The rules require `email` to
 * be the caller's token email lowercased, so it is lowercased here whatever case Google reports.
 */
function memberDoc(deps, email) {
    return { email: lowercasedEmail(email), addedAt: deps.serverTimestamp() };
}
/** First-claim: writes `meta/household` and the claimant's `members/{uid}` doc in one batch. */
export function claimHousehold(db, uid, email) {
    return claimHouseholdWith(HOUSEHOLD_DEPS, db, uid, email);
}
/** `claimHousehold` with the calls injected; `index.ts` does not export it. */
export async function claimHouseholdWith(deps, db, uid, email) {
    const batch = deps.writeBatch(db);
    batch.set(deps.doc(db, HOUSEHOLD_DOC_PATH), { owner: uid });
    batch.set(deps.doc(db, memberDocPath(uid)), memberDoc(deps, email));
    await batch.commit();
}
/**
 * Turns the Invite addressed to `email` into Membership: one batch creates `members/{uid}` and
 * deletes the Invite. Resolves `false` when there is no Invite, or when the rules refuse the join
 * (for example the Invite was revoked in the meantime); any other failure rejects.
 */
export function joinFromInvite(db, uid, email) {
    return joinFromInviteWith(HOUSEHOLD_DEPS, db, uid, email);
}
/** `joinFromInvite` with the calls injected; `index.ts` does not export it. */
export async function joinFromInviteWith(deps, db, uid, email) {
    const invitePath = inviteDocPath(email);
    if (!(await docExists(deps, db, invitePath)))
        return false;
    const batch = deps.writeBatch(db);
    batch.set(deps.doc(db, memberDocPath(uid)), memberDoc(deps, email));
    batch.delete(deps.doc(db, invitePath));
    try {
        await batch.commit();
    }
    catch (error) {
        if (isRulesRefusal(error))
            return false;
        throw error;
    }
    return true;
}
