import { z } from "zod";
import { emailSchema } from "./email.ts";
import { firestoreTimestampSchema } from "./timestamp.ts";

/** `members/{uid}`, the doc `isMember()` checks in the platform's rules. */
export const MEMBERS_COLLECTION = "members";

export const memberSchema = z.object({
  email: emailSchema,
  addedAt: firestoreTimestampSchema,
});

export type Member = z.infer<typeof memberSchema>;
