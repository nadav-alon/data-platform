import type { MealType } from "../nutrition/log-entry.ts";

/**
 * The meal a Log Entry eaten at `eatenAt` most likely was, by the machine's local time: before
 * 11:00 breakfast, before 16:00 lunch, after 20:30 snack, otherwise dinner.
 */
export function guessMealType(eatenAt: Date): MealType {
  const minutes = eatenAt.getHours() * 60 + eatenAt.getMinutes();
  if (minutes < 11 * 60) return "breakfast";
  if (minutes < 16 * 60) return "lunch";
  if (minutes > 20 * 60 + 30) return "snack";
  return "dinner";
}
