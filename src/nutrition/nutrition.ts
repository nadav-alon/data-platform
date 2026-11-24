import { z } from "zod";

/**
 * The macros of some amount of food: energy in kilocalories and protein, carbohydrate and fat in
 * grams, each at least 0. A value shape reused inside documents, never a collection of its own.
 */
export const nutritionSchema = z.looseObject({
  kcal: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
});

export type Nutrition = z.infer<typeof nutritionSchema>;
