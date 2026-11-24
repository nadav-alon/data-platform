import { getAuth } from "firebase/auth";
import { addDoc, collection, doc, getDoc, type Firestore } from "firebase/firestore";
import { z } from "zod";
import { isLive } from "../core/deleted-at.ts";
import { uid } from "../core/uid.ts";
import { FOODS_COLLECTION, foodIdSchema, foodSchema } from "../nutrition/food.ts";
import {
  LOG_ENTRIES_COLLECTION,
  NUTRITION_LOGS_COLLECTION,
  logEntryId,
  logEntrySchema,
  mealTypeSchema,
  type LogEntryId,
} from "../nutrition/log-entry.ts";
import { nutritionSchema, type Nutrition } from "../nutrition/nutrition.ts";
import { guessMealType } from "./meal-type.ts";

/**
 * What a caller supplies to log something eaten: a saved Food by `foodId`, or a quick one-off by
 * `name` and per-serving `nutrition`, never both. `servings` defaults to 1, `eatenAt` (an ISO 8601
 * date-time; one with no offset is the machine's local time) to now, and `mealType` to a guess from
 * `eatenAt`'s local time.
 */
export const logFoodInputSchema = z
  .object({
    foodId: foodIdSchema.optional(),
    name: z.string().min(1).optional(),
    nutrition: nutritionSchema.optional(),
    servings: z.number().positive().optional(),
    mealType: mealTypeSchema.optional(),
    eatenAt: z.iso.datetime({ offset: true, local: true }).optional(),
  })
  .strict();

export type LogFoodInput = z.input<typeof logFoodInputSchema>;

/**
 * Adds a Log Entry to the signed-in Member's own log and returns its id. With a `foodId` the entry
 * snapshots that live Food's name and its per-serving Nutrition times `servings`; a quick entry
 * does the same with the `name` and `nutrition` it is given. Throws when the input names neither
 * or both, or a Food that is missing or soft-deleted, before anything is sent; the write is then
 * checked by `firestore.rules`, so a non-Member's rejects with `permission-denied`.
 */
export async function logFood(
  db: Firestore,
  input: LogFoodInput,
  now: Date = new Date(),
): Promise<LogEntryId> {
  const { foodId, name, nutrition, servings = 1, mealType, eatenAt: eatenAtInput } =
    logFoodInputSchema.parse(input);
  const owner = getAuth(db.app).currentUser?.uid;
  if (owner === undefined) throw new Error("Not signed in: there is no Member to log for.");

  let source: { kind: "food"; foodId: string } | { kind: "quick" };
  let entryName: string;
  let perServing: Nutrition;
  if (foodId !== undefined) {
    if (name !== undefined || nutrition !== undefined) {
      throw new Error("Give either a foodId or a name with nutrition, not both.");
    }
    const snapshot = await getDoc(doc(db, FOODS_COLLECTION, foodId));
    if (!snapshot.exists() || !isLive(snapshot.data())) {
      throw new Error(`No live Food ${JSON.stringify(foodId)}; see list_foods.`);
    }
    const food = foodSchema.parse(snapshot.data());
    source = { kind: "food", foodId };
    entryName = food.name;
    perServing = food.perServing;
  } else {
    if (name === undefined || nutrition === undefined) {
      throw new Error("Give a foodId, or a name with nutrition for a quick entry.");
    }
    source = { kind: "quick" };
    entryName = name;
    perServing = nutrition;
  }

  const eatenAt = eatenAtInput === undefined ? now : new Date(eatenAtInput);
  const entry = logEntrySchema.parse({
    eatenAt,
    mealType: mealType ?? guessMealType(eatenAt),
    source,
    name: entryName,
    servings,
    nutrition: {
      kcal: perServing.kcal * servings,
      proteinG: perServing.proteinG * servings,
      carbsG: perServing.carbsG * servings,
      fatG: perServing.fatG * servings,
    },
  });
  const created = await addDoc(
    collection(db, NUTRITION_LOGS_COLLECTION, uid(owner), LOG_ENTRIES_COLLECTION),
    entry,
  );
  return logEntryId(created.id);
}
