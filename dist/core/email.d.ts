import { z } from "zod";
/** A member's sign-in email, the identity a `members/{uid}` doc records for that Member. */
declare const emailSchema: z.core.$ZodBranded<z.ZodEmail, "Email", "out">;
export type Email = z.infer<typeof emailSchema>;
export declare function isEmail(value: string): value is Email;
export declare function email(value: string): Email;
/** The Email lowercased: the form the rules require of a stored email and of an Invite id. */
export declare function lowercasedEmail(value: Email): Email;
export { emailSchema };
