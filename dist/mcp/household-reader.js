import { collection, getDocs } from "firebase/firestore";
import { isLive } from "../core/deleted-at.js";
import { ITEMS_COLLECTION, itemId, itemSchema } from "../core/item.js";
import { RECIPES_COLLECTION, recipeId, recipeSchema, } from "../recipes/recipe.js";
/**
 * Every live Item in the Household with its State, as stored. Raw data: no grouping or derived
 * fields. Rejects with Firestore's `permission-denied` when the signed-in user is not a Member.
 */
export async function readItems(db) {
    const snapshot = await getDocs(collection(db, ITEMS_COLLECTION));
    return snapshot.docs
        .filter((document) => isLive(document.data()))
        .map((document) => ({ ...itemSchema.parse(document.data()), id: itemId(document.id) }));
}
/**
 * Every live Recipe with its Ingredients and each Ingredient's linked Item, as stored. Raw data:
 * whether a Recipe is makeable, or what to shop for, is left to the reader. Rejects with
 * Firestore's `permission-denied` when the signed-in user is not a Member.
 */
export async function readRecipes(db) {
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
