import { z } from "zod";
/** A Firebase Auth uid: the doc id under `members/`, and the value of `meta/household.owner`. */
const uidSchema = z.string().min(1).brand();
export function isUid(value) {
    return uidSchema.safeParse(value).success;
}
export function uid(value) {
    const result = uidSchema.safeParse(value);
    if (!result.success) {
        throw new Error(`Not a Uid: ${JSON.stringify(value)}`);
    }
    return result.data;
}
export { uidSchema };
