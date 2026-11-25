import { FirebaseError } from "firebase/app";
/** Whether `error` is Firestore's rules denying the request, as opposed to a network or programming error. */
export function isRulesRefusal(error) {
    return error instanceof FirebaseError && error.code === "permission-denied";
}
