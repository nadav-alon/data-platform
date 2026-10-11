import { z } from "zod";
import type { Uid } from "./uid.ts";
/** The collection backing `members/{uid}`, the doc `isMember()` checks in the platform's rules. */
export declare const MEMBERS_COLLECTION = "members";
/** The doc path for a Member, ready for `doc(db, memberDocPath(uid))`. */
export declare function memberDocPath(uid: Uid): string;
export declare const memberSchema: z.ZodObject<{
    email: z.core.$ZodBranded<z.ZodEmail, "Email", "out">;
    addedAt: z.ZodCustom<import("./timestamp.ts").FirestoreTimestamp, import("./timestamp.ts").FirestoreTimestamp>;
}, z.core.$strip>;
export type Member = z.infer<typeof memberSchema>;
