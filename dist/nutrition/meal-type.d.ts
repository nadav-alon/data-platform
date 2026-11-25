import type { MealType } from "./log-entry.ts";
/** The meal eaten at `hours`:`minutes` on the clock: before 11:00 breakfast, before 16:00 lunch, after 21:30 snack, otherwise dinner. */
export declare function guessMealTypeAtClock(hours: number, minutes: number): MealType;
/** The meal a Log Entry eaten at `eatenAt` most likely was, by the machine's local time. */
export declare function guessMealType(eatenAt: Date): MealType;
