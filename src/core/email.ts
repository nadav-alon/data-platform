import { z } from "zod";

/** A member's sign-in email, the identity a `members/{uid}` doc records for that Member. */
const emailSchema = z.email().brand<"Email">();

export type Email = z.infer<typeof emailSchema>;

export function isEmail(value: string): value is Email {
  return emailSchema.safeParse(value).success;
}

export function email(value: string): Email {
  const result = emailSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Not an Email: ${JSON.stringify(value)}`);
  }
  return result.data;
}

/** The Email lowercased: the form the rules require of a stored email and of an Invite id. */
export function lowercasedEmail(value: Email): Email {
  return value.toLowerCase() as Email;
}

export { emailSchema };
