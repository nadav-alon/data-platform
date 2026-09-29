import { z } from "zod";
/**
 * How many other documents currently reference this one, kept accurate by `firestore.rules`
 * (`getAfter`) rather than the client: a document may not be deleted while its count is nonzero.
 */
export declare const referenceCountSchema: z.ZodNumber;
export type ReferenceCount = z.infer<typeof referenceCountSchema>;
