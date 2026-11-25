import { z } from "zod";
const kcalSchema = z.number().min(0).brand();
const gramsSchema = z.number().min(0).brand();
/** The guard. */
export function isKcal(value) {
    return kcalSchema.safeParse(value).success;
}
/** The constructor: narrows, or throws naming the offending value. */
export function kcal(value) {
    if (!isKcal(value))
        throw new Error(`Not a Kcal: ${JSON.stringify(value)}`);
    return value;
}
/** The guard. */
export function isGrams(value) {
    return gramsSchema.safeParse(value).success;
}
/** The constructor: narrows, or throws naming the offending value. */
export function grams(value) {
    if (!isGrams(value))
        throw new Error(`Not Grams: ${JSON.stringify(value)}`);
    return value;
}
/**
 * The macros of some amount of food: energy in kilocalories and protein, carbohydrate and fat in
 * grams, each at least 0. A value shape reused inside documents, never a collection of its own.
 */
export const nutritionSchema = z.looseObject({
    kcal: kcalSchema,
    proteinG: gramsSchema,
    carbsG: gramsSchema,
    fatG: gramsSchema,
});
/** The Nutrition of `servings` servings of something whose one serving has `perServing`. */
export function scaleNutrition(perServing, servings) {
    return {
        ...perServing,
        kcal: kcal(perServing.kcal * servings),
        proteinG: grams(perServing.proteinG * servings),
        carbsG: grams(perServing.carbsG * servings),
        fatG: grams(perServing.fatG * servings),
    };
}
