import { z } from "zod";
/** `nutritionTargets/{uid}`: one doc per Member, keyed by their uid. */
export const NUTRITION_TARGETS_COLLECTION = "nutritionTargets";
const kcalSchema = z.number().positive().brand();
const gramsSchema = z.number().positive().brand();
export function isKcal(value) {
    return kcalSchema.safeParse(value).success;
}
export function kcal(value) {
    if (!isKcal(value))
        throw new Error(`Not a Kcal: ${JSON.stringify(value)}`);
    return value;
}
export function isGrams(value) {
    return gramsSchema.safeParse(value).success;
}
export function grams(value) {
    if (!isGrams(value))
        throw new Error(`Not Grams: ${JSON.stringify(value)}`);
    return value;
}
/**
 * A Member's daily Targets (see **Targets** in CONTEXT.md): what a day is measured against. Each is
 * optional; an absent one means no Target for it.
 */
export const targetsSchema = z.looseObject({
    kcal: kcalSchema.optional(),
    proteinG: gramsSchema.optional(),
    carbsG: gramsSchema.optional(),
    fatG: gramsSchema.optional(),
});
/** Every Target's field name, derived from the schema so a new Target is covered automatically. */
export const TARGET_FIELDS = Object.keys(targetsSchema.shape);
