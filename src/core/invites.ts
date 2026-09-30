import { z } from "zod";
import type { Email } from "./email.ts";
import { firestoreTimestampSchema } from "./timestamp.ts";

/** The collection backing `invites/{email}`: each an Invite, the Owner's offer of Membership to one Google email. */
export const INVITES_COLLECTION = "invites";

/**
 * The doc path for the invite to `email`, ready for `doc(db, inviteDocPath(email))`. Invites are
 * keyed by the invited Google email, lowercased, so the same person's invite has one path
 * however their email is cased.
 */
export function inviteDocPath(email: Email): string {
  return `${INVITES_COLLECTION}/${email.toLowerCase()}`;
}

export const inviteSchema = z.object({
  /**
   * Validates the shape Firestore returns on read. A write using the `serverTimestamp()`
   * sentinel won't parse against this schema; that's expected — this schema is for reads.
   */
  invitedAt: firestoreTimestampSchema,
});

export type Invite = z.infer<typeof inviteSchema>;
