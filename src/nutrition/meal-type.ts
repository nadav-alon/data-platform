import type { MealType } from "./log-entry.ts";

/** The meal eaten at `hours`:`minutes` on the clock: before 11:00 breakfast, before 16:00 lunch, after 20:30 snack, otherwise dinner. */
export function guessMealTypeAtClock(hours: number, minutes: number): MealType {
  const total = hours * 60 + minutes;
  if (total < 11 * 60) return "breakfast";
  if (total < 16 * 60) return "lunch";
  if (total > 20 * 60 + 30) return "snack";
  return "dinner";
}

/** The meal a Log Entry eaten at `eatenAt` most likely was, by the machine's local time. */
export function guessMealType(eatenAt: Date): MealType {
  return guessMealTypeAtClock(eatenAt.getHours(), eatenAt.getMinutes());
}
