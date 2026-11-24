import { z } from "zod";
/** `nutritionTargets/{uid}`: one doc per Member, keyed by their uid. */
export declare const NUTRITION_TARGETS_COLLECTION = "nutritionTargets";
declare const kcalSchema: z.core.$ZodBranded<z.ZodNumber, "Kcal", "out">;
declare const gramsSchema: z.core.$ZodBranded<z.ZodNumber, "Grams", "out">;
/** A positive energy amount, in kilocalories. */
export type Kcal = z.infer<typeof kcalSchema>;
/** A positive mass, in grams. */
export type Grams = z.infer<typeof gramsSchema>;
export declare function isKcal(value: number): value is Kcal;
export declare function kcal(value: number): Kcal;
export declare function isGrams(value: number): value is Grams;
export declare function grams(value: number): Grams;
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
export {};
