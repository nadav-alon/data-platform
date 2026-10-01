import { z } from "zod";
import { emailSchema } from "./email.js";
import { firestoreTimestampSchema } from "./timestamp.js";
/** The collection backing `members/{uid}`, the doc `isMember()` checks in the platform's rules. */
export const MEMBERS_COLLECTION = "members";
/** The doc path for a Member, ready for `doc(db, memberDocPath(uid))`. */
export function memberDocPath(uid) {
    return `${MEMBERS_COLLECTION}/${uid}`;
}
export const memberSchema = z.object({
    email: emailSchema,
    /**
     * Validates the shape Firestore returns on read. A write using the `serverTimestamp()`
     * sentinel won't parse against this schema; that's expected — this schema is for reads.
     */
    addedAt: firestoreTimestampSchema,
});
