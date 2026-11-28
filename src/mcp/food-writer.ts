import { addDoc, collection, deleteField, doc, runTransaction, type Firestore } from "firebase/firestore";
import { z } from "zod";
import { isLive } from "../core/deleted-at.ts";
import { FOODS_COLLECTION, foodId, foodIdSchema, foodSchema, type FoodId } from "../nutrition/food.ts";

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

/**
 * Which Food changes and its new Nutrition: `perServing` and `estimated` are validated as `addFood`
 * validates them, and no other key is accepted.
 */
export const setFoodNutritionSchema = z.strictObject({
  foodId: foodIdSchema,
  perServing: foodSchema.shape.perServing,
  estimated: foodSchema.shape.estimated,
});

export type SetFoodNutrition = z.input<typeof setFoodNutritionSchema>;

/**
 * Replaces a live Food's `perServing` Nutrition and its `estimated` flag (left out clears it: the
 * numbers are then taken from a label or source), keeping its other fields. Existing Log Entries
 * hold their own snapshot and are not touched. The input is validated by `setFoodNutritionSchema`
 * and the resulting Food by the Food schema before anything is sent; a `ZodError` is thrown when
 * either is refused (so a legacy Food that no longer passes the schema cannot be fixed here), and an `Error` for an unknown or soft-deleted Food. The write is then checked
 * by `firestore.rules` as the signed-in Member.
 */
export async function setFoodNutrition(db: Firestore, input: SetFoodNutrition): Promise<FoodId> {
  const { foodId: id, perServing, estimated } = setFoodNutritionSchema.parse(input);
  const ref = doc(db, FOODS_COLLECTION, id);
  await runTransaction(db, async (transaction) => {
    const data = (await transaction.get(ref)).data();
    if (data === undefined || !isLive(data)) {
      throw new Error(`No live Food ${JSON.stringify(id)}; see list_foods.`);
    }
    const { estimated: _estimated, ...rest } = data;
    foodSchema.parse({ ...rest, perServing, ...(estimated === undefined ? {} : { estimated }) });
    transaction.update(ref, { perServing, estimated: estimated ?? deleteField() });
  });
  return foodId(id);
}
