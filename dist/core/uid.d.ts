import { z } from "zod";
/** A Firebase Auth uid: the doc id under `members/`, and the value of `meta/household.owner`. */
declare const uidSchema: z.core.$ZodBranded<z.ZodString, "Uid", "out">;
export type Uid = z.infer<typeof uidSchema>;
export declare function isUid(value: string): value is Uid;
export declare function uid(value: string): Uid;
export { uidSchema };
