import { z } from "zod";
/** A member's sign-in email, the identity a `members/{uid}` doc records for that Member. */
declare const emailSchema: z.core.$ZodBranded<z.ZodEmail, "Email", "out">;
export type Email = z.infer<typeof emailSchema>;
export declare function isEmail(value: string): value is Email;
export declare function email(value: string): Email;
export { emailSchema };
