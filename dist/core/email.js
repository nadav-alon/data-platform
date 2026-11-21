import { z } from "zod";
/** A member's sign-in email, the identity a `members/{uid}` doc records for that Member. */
const emailSchema = z.email().brand();
export function isEmail(value) {
    return emailSchema.safeParse(value).success;
}
export function email(value) {
    const result = emailSchema.safeParse(value);
    if (!result.success) {
        throw new Error(`Not an Email: ${JSON.stringify(value)}`);
    }
    return result.data;
}
/** The Email lowercased: the form the rules require of a stored email and of an Invite id. */
export function lowercasedEmail(value) {
    return value.toLowerCase();
}
export { emailSchema };
