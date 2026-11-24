import { z } from "zod";

const kcalSchema = z.number().min(0).brand<"Kcal">();
const gramsSchema = z.number().min(0).brand<"Grams">();

/** Kilocalories, at least 0 and finite. */
export type Kcal = z.infer<typeof kcalSchema>;

/** A mass in grams, at least 0 and finite. */
export type Grams = z.infer<typeof gramsSchema>;

/** The guard. */
export function isKcal(value: number): value is Kcal {
  return kcalSchema.safeParse(value).success;
}

/** The constructor: narrows, or throws naming the offending value. */
export function kcal(value: number): Kcal {
  if (!isKcal(value)) throw new Error(`Not a Kcal: ${JSON.stringify(value)}`);
  return value;
}

/** The guard. */
export function isGrams(value: number): value is Grams {
  return gramsSchema.safeParse(value).success;
}

/** The constructor: narrows, or throws naming the offending value. */
export function grams(value: number): Grams {
  if (!isGrams(value)) throw new Error(`Not Grams: ${JSON.stringify(value)}`);
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

export type Nutrition = z.infer<typeof nutritionSchema>;

/** The Nutrition of `servings` servings of something whose one serving has `perServing`. */
export function scaleNutrition(perServing: Nutrition, servings: number): Nutrition {
  return {
    ...perServing,
    kcal: kcal(perServing.kcal * servings),
    proteinG: grams(perServing.proteinG * servings),
    carbsG: grams(perServing.carbsG * servings),
    fatG: grams(perServing.fatG * servings),
  };
}
