import { collection, getDocs, type Firestore } from "firebase/firestore";
import type { ZodType } from "zod";
import {
  CATEGORIES_COLLECTION,
  categoryId,
  categorySchema,
  type Category,
  type CategoryId,
} from "../catalogue/category.ts";
import { isLive } from "../core/deleted-at.ts";
import { ITEMS_COLLECTION, itemId, itemSchema, type Item, type ItemId } from "../core/item.ts";
import { FOODS_COLLECTION, foodId, foodSchema, type Food, type FoodId } from "../nutrition/food.ts";
import {
  RECIPES_COLLECTION,
  recipeId,
  recipeSchema,
  type Ingredient,
  type Recipe,
  type RecipeId,
} from "../recipes/recipe.ts";

/** Every live document of a collection, parsed by its schema and given its branded id. */
async function readLive<T extends object, Id>(
  db: Firestore,
  collectionName: string,
  schema: ZodType<T>,
  toId: (id: string) => Id,
): Promise<(T & { readonly id: Id })[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs
    .filter((document) => isLive(document.data()))
    .map((document) => ({ ...schema.parse(document.data()), id: toId(document.id) }));
}

/** An Item as stored, with its document id. Soft-deleted Items are never returned. */
export type ItemRecord = Item & { readonly id: ItemId };

/**
 * Every live Item in the Household with its State, as stored. Raw data: no grouping or derived
 * fields. Rejects with Firestore's `permission-denied` when the signed-in user is not a Member.
 */
export async function readItems(db: Firestore): Promise<ItemRecord[]> {
  return readLive(db, ITEMS_COLLECTION, itemSchema, itemId);
}

/** An Ingredient as stored, with the live Item it links to. */
export type IngredientRecord = Ingredient & {
  /**
   * The linked Item as {@link readItems} returns it, or `null` when the Ingredient names no Item
   * (unlinked or assumed) or names one that is soft-deleted or no longer there.
   */
  readonly item: ItemRecord | null;
};

/** A live Recipe as stored, with its id and each Ingredient's linked Item. */
export type RecipeRecord = Omit<Recipe, "ingredients"> & {
  readonly id: RecipeId;
  readonly ingredients: IngredientRecord[];
};

/**
 * Every live Recipe with its Ingredients and each Ingredient's linked Item, as stored. Raw data:
 * whether a Recipe is makeable, or what to shop for, is left to the reader. Rejects with
 * Firestore's `permission-denied` when the signed-in user is not a Member.
 */
export async function readRecipes(db: Firestore): Promise<RecipeRecord[]> {
  const [items, snapshot] = await Promise.all([
    readItems(db),
    getDocs(collection(db, RECIPES_COLLECTION)),
  ]);
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return snapshot.docs
    .filter((document) => isLive(document.data()))
    .map((document) => {
      const recipe = recipeSchema.parse(document.data());
      return {
        ...recipe,
        id: recipeId(document.id),
        ingredients: recipe.ingredients.map((ingredient) => ({
          ...ingredient,
          item: (ingredient.itemId && itemsById.get(ingredient.itemId)) || null,
        })),
      };
    });
}

/** A Food as stored, with its document id. Soft-deleted Foods are never returned. */
export type FoodRecord = Food & { readonly id: FoodId };

/**
 * Every live Food in the Household with its `place` and `perServing`, as stored. Raw data. Rejects
 * with Firestore's `permission-denied` when the signed-in user is not a Member.
 */
export async function readFoods(db: Firestore): Promise<FoodRecord[]> {
  return readLive(db, FOODS_COLLECTION, foodSchema, foodId);
}

/** A Category as stored, with its document id. Soft-deleted Categories are never returned. */
export type CategoryRecord = Category & { readonly id: CategoryId };

/**
 * Every live Category with its name and default Shop (`defaultShopId`), as stored. Raw data.
 * Rejects with Firestore's `permission-denied` when the signed-in user is not a Member.
 */
export async function readCategories(db: Firestore): Promise<CategoryRecord[]> {
  return readLive(db, CATEGORIES_COLLECTION, categorySchema, categoryId);
}
