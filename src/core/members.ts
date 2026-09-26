import { z } from "zod";
import { emailSchema } from "./email.ts";
import { firestoreTimestampSchema } from "./timestamp.ts";
import type { Uid } from "./uid.ts";

/** The collection backing `members/{uid}`, the doc `isMember()` checks in the platform's rules. */
export const MEMBERS_COLLECTION = "members";

/** The doc path for a Member, ready for `doc(db, memberDocPath(uid))`. */
export function memberDocPath(uid: Uid): string {
  return `${MEMBERS_COLLECTION}/${uid}`;
}

export const memberSchema = z.object({
  email: emailSchema,
  addedAt: firestoreTimestampSchema,
});

export type Member = z.infer<typeof memberSchema>;
