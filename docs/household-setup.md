# Household setup

How a Household gets this platform into its own Firebase project, from a clone; deploy can also run
from a fork's Action. No step below names a specific Household's project id — pass yours as an
argument or a repo variable, never writing it into the repo itself.

1. **Provision the project, Firestore and a web app.** Run `npx firebase login`, then
   `npm run provision -- --project <id> --location <location>` from a clone (after `npm ci`).
   It creates the Firebase project on the [Spark (free) plan](https://firebase.google.com/pricing),
   the Firestore database at that location in production mode, and a web app named after the
   project id, then prints the web app's SDK config snippet (`apiKey`, `authDomain`, `projectId`,
   …) — the way the upstream app's Firebase SDK finds this project. This repo doesn't read the
   snippet; keep it for step 6. A step already done is skipped, so re-running is safe, and
   `npm run provision -- --help` says where each input comes from.
2. **Enable the Google sign-in provider**, under Authentication → Sign-in method.
3. **Add the upstream app's host to Authorized domains**, under Authentication → Settings →
   Authorized domains — otherwise Google sign-in rejects it.
4. **Generate a deploy key, and grant its service account two IAM roles.** Install the
   [gcloud CLI](https://cloud.google.com/sdk/docs/install), run `gcloud auth login`, then re-run
   `npm run provision -- --project <id> --location <location> --key-out <path>`, with a path
   outside the clone — the script refuses one inside it, and never overwrites a key file already
   there. It writes the key of the project's `firebase-adminsdk-…` service account to `<path>` and
   grants that service account these two roles, which it can't deploy rules without; a role already
   granted is skipped. Do both before the first deploy, unless the rules deploy authenticates with a
   `FIREBASE_TOKEN` secret instead (step 5). If `gcloud` is missing or logged out the script stops
   before changing anything.

   - **Service Usage Consumer** — without it, deploy fails with `403 Permission denied to get
     service [firestore.googleapis.com]` from `serviceusage.googleapis.com`.
   - **Firebase Rules Admin** — without it, deploy fails with `403 The caller does not have
     permission` from `firebaserules.googleapis.com/v1/projects/<id>:test`.

   Because `meta/platform` is written only after the rules deploy succeeds, a deploy that fails on
   either error leaves `meta/platform` untouched, still naming the last version whose rules are
   actually live — grant the missing role and redeploy. A failure after the rules deploy instead —
   the `meta/platform` write itself failing, or this being the very first deploy — leaves
   `meta/platform` a version behind rules that are already live; redeploy to catch it up. The same
   key secures deploy-on-release, so it needs both roles too.
5. **Deploy.** This checks that the service account key from step 4 has the roles above, backfills
   `referenceCount` onto every existing Shop and Category, deploys `firestore.rules`, then writes
   `meta/platform` with this repo's version, so apps can tell what's live — in that order, so the
   backfill always finishes before the rules that require `referenceCount` go live, and a failure
   never leaves `meta/platform` claiming a version whose rules aren't live. The backfill and the
   `meta/platform` write are both Admin SDK writes, made with that same key. The backfill's read of
   existing data isn't atomic with client writes, so the first deploy onto 0.3.0 or later should
   run while no client is writing catalogue data — a reference added mid-backfill won't be counted.

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
     required either way — the deploy script checks that key's roles before `firestore.rules`
     deploys, whichever credential (the key or `FIREBASE_TOKEN`) actually runs that deploy.
6. **Open the upstream app's setup screen, and paste the config snippet from step 1 into it.** The
   first person to sign in there claims the Household as its Owner.
