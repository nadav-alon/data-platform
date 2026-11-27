import { z } from "zod";
/** `nutritionSettings/{uid}`: one doc per Member, keyed by their uid. */
export const NUTRITION_SETTINGS_COLLECTION = "nutritionSettings";
/**
 * A Member's private Nutrition Settings (see **Nutrition Settings** in CONTEXT.md). `googleHealthSync`
 * is `true` when the Member pushes their own Log Entries to Google Health; off is spelled as the
 * field's absence, never `false`. Any other field is refused.
 */
export const nutritionSettingsSchema = z.strictObject({
    googleHealthSync: z.literal(true).optional(),
});
