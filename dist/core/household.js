import { z } from "zod";
import { uidSchema } from "./uid.js";
/** Written once, by first-claim: whoever creates it becomes the Household's owner. */
export const HOUSEHOLD_DOC_PATH = "meta/household";
export const householdMetaSchema = z.object({
    owner: uidSchema,
});
