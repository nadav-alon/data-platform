import { addDoc, collection, type Firestore } from "firebase/firestore";
import { z } from "zod";
import { FOODS_COLLECTION, foodId, foodSchema, type FoodId } from "../nutrition/food.ts";

/**
 * What a caller supplies to add a Food: a live Food, so never a `deletedAt`, and no key the schema
 * does not name (the stored Food schema is loose; this input is strict).
 */
export const newFoodSchema = foodSchema.omit({ deletedAt: true }).strict();

export type NewFood = z.input<typeof newFoodSchema>;

/**
 * Adds a live Food and returns its id. The input is validated by the Food zod schema before
 * anything is sent, and throws a `ZodError` when it is refused; the write is then checked by
 * `firestore.rules` as the signed-in Member, so a non-Member's write rejects with Firestore's
 * `permission-denied`.
 */
export async function addFood(db: Firestore, input: NewFood): Promise<FoodId> {
  const food = newFoodSchema.parse(input);
  const created = await addDoc(collection(db, FOODS_COLLECTION), food);
  return foodId(created.id);
}
