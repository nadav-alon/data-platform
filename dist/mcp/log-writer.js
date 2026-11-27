import { getAuth } from "firebase/auth";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { z } from "zod";
import { isLive } from "../core/deleted-at.js";
import { uid } from "../core/uid.js";
import { FOODS_COLLECTION, foodIdSchema, foodSchema } from "../nutrition/food.js";
import { LOG_ENTRIES_COLLECTION, NUTRITION_LOGS_COLLECTION, logEntryId, logEntrySchema, mealTypeSchema, } from "../nutrition/log-entry.js";
import { guessMealType, guessMealTypeAtClock } from "../nutrition/meal-type.js";
import { nutritionSchema, scaleNutrition } from "../nutrition/nutrition.js";
/**
 * What a caller supplies to log something eaten: a saved Food by `foodId`, or a quick one-off by
 * `name` and per-serving `nutrition`, never both. `estimated` flags a quick entry's numbers as a
 * guess (only `true` is stored; `false` is the same as leaving it out); with a `foodId` it is
 * ignored and the entry takes the Food's own flag. `servings` defaults to 1, `eatenAt` (an ISO
 * 8601 date-time; one with no offset is the machine's local time) to now, and `mealType` to a
 * guess from `eatenAt`'s clock time: the offset it carries, or the machine's local time when it
 * carries none.
 */
export const logFoodInputSchema = z
    .object({
    foodId: foodIdSchema.optional(),
    name: logEntrySchema.shape.name.optional(),
    nutrition: nutritionSchema.optional(),
    servings: logEntrySchema.shape.servings.optional(),
    mealType: mealTypeSchema.optional(),
    eatenAt: z.iso.datetime({ offset: true, local: true }).optional(),
    estimated: z.boolean().optional(),
})
    .strict();
/**
 * Adds a Log Entry to the signed-in Member's own log and returns its id. With a `foodId` the entry
 * snapshots that live Food's name and its per-serving Nutrition times `servings`; a quick entry
 * does the same with the `name` and `nutrition` it is given. Throws when the input names neither
 * or both, or a Food that is missing or soft-deleted, before anything is sent; the write is then
 * checked by `firestore.rules`, so a non-Member's rejects with `permission-denied`.
 */
export async function logFood(db, input, now = new Date()) {
    const { foodId, name, nutrition, servings = 1, mealType, eatenAt: eatenAtInput, estimated } = logFoodInputSchema.parse(input);
    const currentUid = getAuth(db.app).currentUser?.uid;
    if (currentUid === undefined)
        throw new Error("Not signed in: there is no Member to log for.");
    const owner = uid(currentUid);
    let source;
    let entryName;
    let perServing;
    let entryEstimated;
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
        entryEstimated = food.estimated;
    }
    else {
        if (name === undefined || nutrition === undefined) {
            throw new Error("Give a foodId, or a name with nutrition for a quick entry.");
        }
        source = { kind: "quick" };
        entryName = name;
        perServing = nutrition;
        entryEstimated = estimated === true ? true : undefined;
    }
    const eatenAt = eatenAtInput === undefined ? now : new Date(eatenAtInput);
    const entry = logEntrySchema.parse({
        eatenAt,
        mealType: mealType ?? guessMealTypeOf(eatenAtInput, eatenAt),
        source,
        name: entryName,
        servings,
        nutrition: scaleNutrition(perServing, servings),
        ...(entryEstimated === undefined ? {} : { estimated: entryEstimated }),
    });
    const created = await addDoc(collection(db, NUTRITION_LOGS_COLLECTION, owner, LOG_ENTRIES_COLLECTION), entry);
    return logEntryId(created.id);
}
/** The meal by the clock time `eatenAtInput` itself states, so an offset the caller gave is kept; `eatenAt` when there is none. */
function guessMealTypeOf(eatenAtInput, eatenAt) {
    const clock = eatenAtInput?.match(/T(\d{2}):(\d{2})/);
    return clock === null || clock === undefined
        ? guessMealType(eatenAt)
        : guessMealTypeAtClock(Number(clock[1]), Number(clock[2]));
}
