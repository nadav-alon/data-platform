import { z } from "zod";
/**
 * How many other documents currently reference this one, kept accurate by `firestore.rules`
 * (`getAfter`) rather than the client: a document may not be soft-deleted while its count is
 * nonzero.
 */
export const referenceCountSchema = z.number().int().nonnegative();
