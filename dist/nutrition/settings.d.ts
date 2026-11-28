import { z } from "zod";
/** `nutritionSettings/{uid}`: one doc per Member, keyed by their uid. */
export declare const NUTRITION_SETTINGS_COLLECTION = "nutritionSettings";
/**
 * A Member's private Nutrition Settings (see **Nutrition Settings** in CONTEXT.md). `googleHealthSync`
 * is `true` when the Member pushes their own Log Entries to Google Health; off is spelled as the
 * field's absence, never `false`. Any other field is refused.
 */
export declare const nutritionSettingsSchema: z.ZodObject<{
    googleHealthSync: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>;
export type NutritionSettings = z.infer<typeof nutritionSettingsSchema>;
