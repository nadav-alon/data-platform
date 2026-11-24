import { email } from "../core/email.js";
import { uid } from "../core/uid.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, } from "firebase/auth";
const AUTH_DEPS = {
    getAuth,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    newGoogleProvider: () => new GoogleAuthProvider(),
};
/**
 * The Google sign-in client for an app from `initFirebase`. Through `initFirebase(config, { local: localKit })`
 * the app's Auth is the local kit's, so sign-in goes through the Auth emulator's popup. The app's
 * Auth is looked up on each call, so a hand-wired local app may build the client before
 * `initLocalAuth`.
 */
export function authClient(app) {
    return authClientWith(AUTH_DEPS, app);
}
/** `authClient` with the calls injected; `index.ts` does not export it. */
export function authClientWith(deps, app) {
    return {
        signIn: async () => {
            const credential = await deps.signInWithPopup(deps.getAuth(app), deps.newGoogleProvider());
            return toAuthUser(credential.user);
        },
        signOut: () => deps.signOut(deps.getAuth(app)),
        onAuthChange: (listener) => deps.onAuthStateChanged(deps.getAuth(app), (user) => listener(user === null ? null : toAuthUser(user))),
        currentUid: () => {
            const user = deps.getAuth(app).currentUser;
            return user === null ? null : uid(user.uid);
        },
    };
}
function toAuthUser(user) {
    if (user.email === null) {
        throw new Error(`Signed-in user ${user.uid} has no email`);
    }
    return { uid: uid(user.uid), email: email(user.email) };
}
