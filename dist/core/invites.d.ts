import { z } from "zod";
import type { Email } from "./email.ts";
/** The collection backing `invites/{email}`: each an Invite, the Owner's offer of Membership to one Google email. */
export declare const INVITES_COLLECTION = "invites";
/**
 * The doc path for the invite to `email`, ready for `doc(db, inviteDocPath(email))`. Invites are
 * keyed by the invited Google email, lowercased, so the same person's invite has one path
 * however their email is cased.
 */
export declare function inviteDocPath(email: Email): string;
export declare const inviteSchema: z.ZodObject<{
    invitedAt: z.ZodCustom<import("./timestamp.ts").FirestoreTimestamp, import("./timestamp.ts").FirestoreTimestamp>;
}, z.core.$strip>;
export type Invite = z.infer<typeof inviteSchema>;
