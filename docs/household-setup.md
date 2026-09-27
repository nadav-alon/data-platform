# Household setup

How a Household gets this platform into its own Firebase project, from a clone or from a fork's
Action. No step below names a specific Household's project id — pass yours as an argument each
time instead of writing it into the repo.

1. **Create a Firebase project.** The [Spark (free) plan](https://firebase.google.com/pricing) is
   enough for one Household.
2. **Enable Firestore** for that project, in production mode.
3. **Enable the Google sign-in provider**, under Authentication → Sign-in method.
4. **Add the upstream app's host to Authorized domains**, under Authentication → Settings →
   Authorized domains — otherwise Google sign-in rejects it.
5. **Run deploy.** This deploys `firestore.rules` and writes `meta/platform` with this
   repo's version, so apps can tell what's live. Writing `meta/platform` is an Admin SDK write,
   made with a service account key: Firebase project → Project settings → Service accounts →
   Generate new private key.

   - **From a clone**: `GOOGLE_APPLICATION_CREDENTIALS=<path to the key> npm run deploy --
     --project <id>`, with the [Firebase CLI](https://firebase.google.com/docs/cli) installed.
   - **From a fork, with no local toolchain**: run the repo's `Deploy` Action
     (workflow_dispatch), passing the project id as its input, with the key pasted into the
     `FIREBASE_SERVICE_ACCOUNT` repo secret. A `FIREBASE_TOKEN` secret (`firebase login:ci`)
     works too, but only for the `firestore.rules` half — writing `meta/platform` always needs
     `FIREBASE_SERVICE_ACCOUNT`.
6. **Open the app's setup screen.** The first person to sign in there claims the Household as its
   Owner.
