import { z } from "zod";

/** `nutritionTargets/{uid}`: one doc per Member, keyed by their uid. */
export const NUTRITION_TARGETS_COLLECTION = "nutritionTargets";

/** A Target is a Kcal or Grams (see nutrition.ts) that is also above zero: a Target of 0 means nothing. */
const kcalTargetSchema = z.number().positive().brand<"Kcal">();
const gramsTargetSchema = z.number().positive().brand<"Grams">();

/**
 * A Member's daily Targets (see **Targets** in CONTEXT.md): what a day is measured against. Each is
 * optional; an absent one means no Target for it.
 */
export const targetsSchema = z.looseObject({
  kcal: kcalTargetSchema.optional(),
  proteinG: gramsTargetSchema.optional(),
  carbsG: gramsTargetSchema.optional(),
  fatG: gramsTargetSchema.optional(),
});

export type Targets = z.infer<typeof targetsSchema>;

/** Every Target's field name, derived from the schema so a new Target is covered automatically. */
export const TARGET_FIELDS = Object.keys(targetsSchema.shape) as (keyof typeof targetsSchema.shape)[];
