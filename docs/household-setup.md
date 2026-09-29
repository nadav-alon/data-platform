# Household setup

How a Household gets this platform into its own Firebase project, from a clone or from a fork's
Action. No step below names a specific Household's project id — pass yours as an argument or a
repo variable, never writing it into the repo itself.

1. **Create a Firebase project.** The [Spark (free) plan](https://firebase.google.com/pricing) is
   enough for one Household.
2. **Enable Firestore** for that project, in production mode.
3. **Enable the Google sign-in provider**, under Authentication → Sign-in method.
4. **Add the upstream app's host to Authorized domains**, under Authentication → Settings →
   Authorized domains — otherwise Google sign-in rejects it.
5. **Generate a deploy key, and grant its service account two IAM roles.** Firebase project →
   Project settings → Service accounts → Generate new private key. That key belongs to a
   `firebase-adminsdk-…` service account, which by default can't run a rules deploy — grant it
   these two roles before the first deploy, unless the rules deploy authenticates with a
   `FIREBASE_TOKEN` secret instead (step 6), at
   [`https://console.cloud.google.com/iam-admin/iam?project=<id>`](https://console.cloud.google.com/iam-admin/iam?project=<id>)
   → find the `firebase-adminsdk-…` principal → Add another role:

   - **Service Usage Consumer** — without it, deploy fails with `403 Permission denied to get
     service [firestore.googleapis.com]` from `serviceusage.googleapis.com`.
   - **Firebase Rules Admin** — without it, deploy fails with `403 The caller does not have
     permission` from `firebaserules.googleapis.com/v1/projects/<id>:test`.

   Because `meta/platform` is written before the rules deploy (step 6), a deploy that fails on
   either error still leaves `meta/platform` claiming a version the rules don't match — if you see
   one of them, grant the missing role and redeploy. The same key secures deploy-on-release, so it
   needs both roles too.
6. **Deploy.** This deploys `firestore.rules` and writes `meta/platform` with this
   repo's version, so apps can tell what's live. Writing `meta/platform` is an Admin SDK write,
   made with the service account key from step 5.

   - **On every release, automatically**: set the project id as the repo's `FIREBASE_PROJECT_ID`
     Actions variable (Settings → Secrets and variables → Actions → Variables) and paste the key
     into the `FIREBASE_SERVICE_ACCOUNT` repo secret. The project id stays a repo variable, never
     written into the repo. From then on, the [Release Action](../RELEASING.md) deploys to that
     project right after it tags a release — not on other pushes; leave the variable unset to
     keep deploying manual.
   - **From a clone**: `GOOGLE_APPLICATION_CREDENTIALS=<path to the key> npm run deploy --
     --project <id>`. `npm ci` installs the [Firebase CLI](https://firebase.google.com/docs/cli)
     as a dev dependency, so no separate install is needed — the CLI picks up the same
     credentials as the deploy script.
   - **From a fork, with no local toolchain**: run the repo's `Deploy` Action
     (workflow_dispatch), passing the project id as its input, with the key pasted into the
     `FIREBASE_SERVICE_ACCOUNT` repo secret. A `FIREBASE_TOKEN` secret (`firebase login:ci`) can
     additionally authenticate the `firestore.rules` deploy, but `FIREBASE_SERVICE_ACCOUNT` is
     required either way — meta/platform is written, and its credential resolved, before
     firestore.rules deploys.
7. **Open the app's setup screen.** The first person to sign in there claims the Household as its
   Owner.
