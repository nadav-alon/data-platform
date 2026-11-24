/** The meal eaten at `hours`:`minutes` on the clock: before 11:00 breakfast, before 16:00 lunch, after 21:30 snack, otherwise dinner. */
export function guessMealTypeAtClock(hours, minutes) {
    const total = hours * 60 + minutes;
    if (total < 11 * 60)
        return "breakfast";
    if (total < 16 * 60)
        return "lunch";
    if (total > 21 * 60 + 30)
        return "snack";
    return "dinner";
}
/** The meal a Log Entry eaten at `eatenAt` most likely was, by the machine's local time. */
export function guessMealType(eatenAt) {
    return guessMealTypeAtClock(eatenAt.getHours(), eatenAt.getMinutes());
}
