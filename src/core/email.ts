import { z } from "zod";

/** A member's sign-in email, the identity a `members/{uid}` doc records for its owner. */
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

export { emailSchema };
