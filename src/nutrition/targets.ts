import { z } from "zod";

/** `nutritionTargets/{uid}`: one doc per Member, keyed by their uid. */
export const NUTRITION_TARGETS_COLLECTION = "nutritionTargets";

const targetSchema = z.number().positive();

/**
 * A Member's daily Targets (see **Targets** in CONTEXT.md): what a day's Log Entries are measured
 * against. Each is optional; an absent one means no Target for it.
 */
export const targetsSchema = z.looseObject({
  kcal: targetSchema.optional(),
  proteinG: targetSchema.optional(),
  carbsG: targetSchema.optional(),
  fatG: targetSchema.optional(),
});

export type Targets = z.infer<typeof targetsSchema>;
