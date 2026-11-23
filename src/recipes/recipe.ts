import { z } from "zod";
import { deletedAtSchema, itemIdSchema } from "../core/index.ts";

export const RECIPES_COLLECTION = "recipes";

declare const recipeIdBrand: unique symbol;

export type RecipeId = string & { readonly [recipeIdBrand]: true };

export function isRecipeId(value: string): value is RecipeId {
  return value.length > 0;
}

export function recipeId(value: string): RecipeId {
  if (!isRecipeId(value)) {
    throw new Error(`RecipeId must not be empty, got ${JSON.stringify(value)}`);
  }
  return value;
}

export const recipeIdSchema = z.string().refine(isRecipeId, "RecipeId must not be empty");

/** The units an Ingredient's `quantity` can be measured in. */
export const INGREDIENT_UNITS = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece"] as const;

export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

/**
 * One line of a Recipe. `itemId` links it to a Core Item; `assumed` marks a staple taken as
 * already in the house, so it never names an Item. A `unit` only means something beside a
 * `quantity`. `bought` marks an unlinked Ingredient (no Item, not assumed) of a Wanted Recipe as
 * bought; absent means not bought.
 */
export const ingredientSchema = z
  .looseObject({
    name: z.string().min(1),
    itemId: itemIdSchema.optional(),
    assumed: z.literal(true).optional(),
    quantity: z.number().positive().optional(),
    unit: z.enum(INGREDIENT_UNITS).optional(),
    prepNote: z.string().optional(),
    bought: z.literal(true).optional(),
  })
  .refine((ingredient) => !(ingredient.bought === true && ingredient.itemId !== undefined), {
    message: "An Ingredient that names an Item is never bought: its Item is what gets bought",
  })
  .refine((ingredient) => !(ingredient.bought === true && ingredient.assumed === true), {
    message: "An assumed Ingredient is never bought",
  })
  .refine((ingredient) => !(ingredient.assumed === true && ingredient.itemId !== undefined), {
    message: "An assumed Ingredient must not name an Item",
  })
  .refine((ingredient) => ingredient.unit === undefined || ingredient.quantity !== undefined, {
    message: "An Ingredient's unit needs a quantity",
  });

export type Ingredient = z.infer<typeof ingredientSchema>;

/**
 * One document with everything embedded. `wanted` says the Household wants to make it; absent
 * means not wanted. Never versioned and never hard-deleted, so its id stays
 * stable for anything that points at it.
 */
export const recipeSchema = z.looseObject({
  title: z.string().min(1),
  ingredients: z.array(ingredientSchema),
  prepSteps: z.array(z.string().min(1)),
  steps: z.array(z.string().min(1)),
  servings: z.number().int().positive().optional(),
  sourceUrl: z.string().optional(),
  notes: z.string().optional(),
  wanted: z.literal(true).optional(),
  deletedAt: deletedAtSchema,
});

export type Recipe = z.infer<typeof recipeSchema>;

/** An Ingredient without its `bought`: what clearing it, or giving the Ingredient an Item or Assumed, leaves. */
export function withoutBought<T extends { bought?: unknown }>(ingredient: T): Omit<T, "bought"> {
  const { bought: _bought, ...rest } = ingredient;
  return rest;
}

/** A Recipe snapshot's data when it is live; throws an `Error` for an unknown or soft-deleted Recipe. */
export function liveRecipeData(snapshot: { data(): unknown }, id: RecipeId): unknown {
  const data = snapshot.data() as { deletedAt?: unknown } | undefined;
  if (data === undefined || data.deletedAt !== undefined) {
    throw new Error(`No live Recipe ${JSON.stringify(id)}`);
  }
  return data;
}

/** The Recipe's Ingredient at `position`; throws an `Error` for a position that is not one. */
export function ingredientAt(recipe: Recipe, id: RecipeId, position: number): Ingredient {
  const ingredient = recipe.ingredients[position];
  if (ingredient === undefined) {
    throw new Error(`Recipe ${JSON.stringify(id)} has no Ingredient ${position}`);
  }
  return ingredient;
}
