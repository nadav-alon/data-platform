/**
 * Trims space, tab, newline and carriage return and lowercases A-Z only. Beyond ASCII,
 * `firestore.rules` trims and lowercases a different set of characters than JS does, so a wider
 * key would disagree with the rules; names differing only by non-ASCII case or whitespace stay
 * distinct.
 */
export declare function normalizeName(name: string): string;
/**
 * The normalised name with `%` and `/` escaped as `%25` and `%2F`. Two names share an escaped form
 * only when they are equal after trimming and lowercasing. Not yet checked as a doc id: see
 * `isNameKey`.
 */
export declare function escapeName(name: string): string;
/**
 * Whether `value` is a non-empty, trimmed, lowercased name with `%` and `/` escaped, that Firestore
 * accepts as a doc id: not `.` or `..`, not `__.*__`, at most `MAX_NAME_KEY_LENGTH` characters.
 * `firestore.rules` computes the same key for every name-reserving collection.
 */
export declare function isNameKey(value: string): boolean;
