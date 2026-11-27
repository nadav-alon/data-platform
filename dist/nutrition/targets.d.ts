import { z } from "zod";
/** `nutritionTargets/{uid}`: one doc per Member, keyed by their uid. */
export declare const NUTRITION_TARGETS_COLLECTION = "nutritionTargets";
/**
 * A Member's daily Targets (see **Targets** in CONTEXT.md): what a day is measured against. Each is
 * optional; an absent one means no Target for it.
 */
export declare const targetsSchema: z.ZodObject<{
    kcal: z.ZodOptional<z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">>;
    proteinG: z.ZodOptional<z.core.$ZodBranded<z.ZodNumber, "Grams", "out">>;
    carbsG: z.ZodOptional<z.core.$ZodBranded<z.ZodNumber, "Grams", "out">>;
    fatG: z.ZodOptional<z.core.$ZodBranded<z.ZodNumber, "Grams", "out">>;
}, z.core.$loose>;
export type Targets = z.infer<typeof targetsSchema>;
/** Every Target's field name, derived from the schema so a new Target is covered automatically. */
export declare const TARGET_FIELDS: (keyof typeof targetsSchema.shape)[];
