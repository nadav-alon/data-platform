import { test } from "node:test";
import assert from "node:assert/strict";
import { recipes } from "../index.ts";
import {
  RECIPES_COLLECTION,
  isRecipeId,
  recipeId,
  recipeIdSchema,
  recipeSchema,
  type RecipeId,
} from "./recipe.ts";

const valid = {
  title: "Pancakes",
  ingredients: [{ name: "Flour", itemId: "flour", quantity: 200, unit: "g", prepNote: "sifted" }],
  prepSteps: ["Sift the flour"],
  steps: ["Mix", "Fry"],
  servings: 4,
  sourceUrl: "https://example.com/pancakes",
  notes: "Good",
};

const withIngredient = (ingredient: Record<string, unknown>) => ({
  ...valid,
  ingredients: [ingredient],
});

test("names its collection recipes", () => {
  assert.equal(RECIPES_COLLECTION, "recipes");
});

test("accepts a full Recipe", () => {
  assert.equal(recipeSchema.parse(valid).title, "Pancakes");
});

test("accepts a minimal Recipe with empty lists", () => {
  assert.ok(recipeSchema.safeParse({ title: "Toast", ingredients: [], prepSteps: [], steps: [] }).success);
});

test("tolerates an unknown field", () => {
  assert.ok(recipeSchema.safeParse({ ...valid, extra: 1 }).success);
});

test("rejects an empty title", () => {
  assert.ok(!recipeSchema.safeParse({ ...valid, title: "" }).success);
});

test("rejects an empty Ingredient name", () => {
  assert.ok(!recipeSchema.safeParse(withIngredient({ name: "" })).success);
});

test("rejects assumed together with itemId", () => {
  assert.ok(!recipeSchema.safeParse(withIngredient({ name: "Salt", assumed: true, itemId: "salt" })).success);
});

test("accepts assumed without itemId", () => {
  assert.ok(recipeSchema.safeParse(withIngredient({ name: "Salt", assumed: true })).success);
});

test("rejects assumed: false", () => {
  assert.ok(!recipeSchema.safeParse(withIngredient({ name: "Salt", assumed: false })).success);
});

test("rejects a unit without a quantity", () => {
  assert.ok(!recipeSchema.safeParse(withIngredient({ name: "Flour", unit: "g" })).success);
});

test("accepts a quantity without a unit", () => {
  assert.ok(recipeSchema.safeParse(withIngredient({ name: "Egg", quantity: 2 })).success);
});

test("rejects an unknown unit", () => {
  assert.ok(!recipeSchema.safeParse(withIngredient({ name: "Flour", quantity: 1, unit: "pinch" })).success);
});

test("rejects a non-positive quantity", () => {
  assert.ok(!recipeSchema.safeParse(withIngredient({ name: "Flour", quantity: 0 })).success);
});

test("rejects an empty step", () => {
  assert.ok(!recipeSchema.safeParse({ ...valid, steps: [""] }).success);
  assert.ok(!recipeSchema.safeParse({ ...valid, prepSteps: [""] }).success);
});

test("rejects a non-positive or fractional servings", () => {
  assert.ok(!recipeSchema.safeParse({ ...valid, servings: 0 }).success);
  assert.ok(!recipeSchema.safeParse({ ...valid, servings: 1.5 }).success);
});

test("isRecipeId accepts a non-empty string", () => {
  assert.equal(isRecipeId("pancakes"), true);
});

test("isRecipeId rejects an empty string", () => {
  assert.equal(isRecipeId(""), false);
});

test("recipeId narrows a valid value", () => {
  assert.equal(recipeId("pancakes"), "pancakes");
});

test("recipeId throws on an empty value, naming the value", () => {
  assert.throws(() => recipeId(""), /got ""/);
});

test("recipeIdSchema accepts a non-empty string", () => {
  const parsed: RecipeId = recipeIdSchema.parse("pancakes");
  assert.equal(parsed, "pancakes");
});

test("recipeIdSchema rejects an empty string", () => {
  assert.throws(() => recipeIdSchema.parse(""));
});

test("RecipeId's guard, constructor and schema are reachable through recipes", () => {
  const id: recipes.RecipeId = recipeId("pancakes");
  assert.equal(id, "pancakes");
  assert.equal(recipes.isRecipeId, isRecipeId);
  assert.equal(recipes.recipeId, recipeId);
  assert.equal(recipes.recipeIdSchema, recipeIdSchema);
});
