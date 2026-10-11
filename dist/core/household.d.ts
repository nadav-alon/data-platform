import { z } from "zod";
/** Written once, by first-claim: whoever creates it becomes the Household's owner. */
export declare const HOUSEHOLD_DOC_PATH = "meta/household";
export declare const householdMetaSchema: z.ZodObject<{
    owner: z.core.$ZodBranded<z.ZodString, "Uid", "out">;
}, z.core.$strip>;
export type HouseholdMeta = z.infer<typeof householdMetaSchema>;
