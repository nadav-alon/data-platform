const ESCAPED = /%(?:25|2F)/g;
/**
 * Trims space, tab, newline and carriage return and lowercases A-Z only. Beyond ASCII,
 * `firestore.rules` trims and lowercases a different set of characters than JS does, so a wider
 * key would disagree with the rules; names differing only by non-ASCII case or whitespace stay
 * distinct.
 */
export function normalizeName(name) {
    return name
        .replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, "")
        .replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}
/** Longest key, well inside Firestore's 1500-byte doc id limit at four bytes a character. */
const MAX_NAME_KEY_LENGTH = 100;
/**
 * The normalised name with `%` and `/` escaped as `%25` and `%2F`. Two names share an escaped form
 * only when they are equal after trimming and lowercasing. Not yet checked as a doc id: see
 * `isNameKey`.
 */
export function escapeName(name) {
    return normalizeName(name).replaceAll("%", "%25").replaceAll("/", "%2F");
}
/**
 * Whether `value` is a non-empty, trimmed, lowercased name with `%` and `/` escaped, that Firestore
 * accepts as a doc id: not `.` or `..`, not `__.*__`, at most `MAX_NAME_KEY_LENGTH` characters.
 * `firestore.rules` computes the same key for every name-reserving collection.
 */
export function isNameKey(value) {
    if (value.length > MAX_NAME_KEY_LENGTH || value === "." || value === "..")
        return false;
    if (/^__[\s\S]*__$/.test(value))
        return false;
    if (!/^(?:[^%/]|%25|%2F)+$/.test(value))
        return false;
    const name = value.replace(ESCAPED, (escape) => (escape === "%25" ? "%" : "/"));
    return name === normalizeName(name);
}
