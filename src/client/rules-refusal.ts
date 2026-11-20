import { FirebaseError } from "firebase/app";

/** Whether `error` is Firestore's rules denying the write, as opposed to a network or programming error. */
export function isRulesRefusal(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "permission-denied";
}
