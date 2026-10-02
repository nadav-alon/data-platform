import { GCLOUD_INSTALL_URL, GCLOUD_LOGIN_COMMAND, LOGIN_COMMAND } from "./provision-order.ts";

/** What `--help` prints: where a newcomer gets each input, and what the output is for. */
export const HELP = `Provision a Household's Firebase project, Firestore database and web app.

Usage: npm run provision -- --project <id> --location <location> [--key-out <path>]

Run \`${LOGIN_COMMAND}\` first; the script stops before changing anything if the CLI is logged out.
With --key-out, install gcloud (${GCLOUD_INSTALL_URL}) and run \`${GCLOUD_LOGIN_COMMAND}\` too; the same check applies.
A step that is already done is skipped, so re-running is safe.

Inputs (--project and --location required, no defaults):
  --project <id>        The id to create the Firebase project under. You choose it: 6-30 lowercase
                        letters, digits and hyphens, starting with a letter, not ending in a hyphen,
                        and unique across all of Google Cloud. The web app is named after it.
  --location <location> Where Firestore stores data, e.g. eur3 or europe-west1. It cannot be changed
                        later. Pick from https://firebase.google.com/docs/firestore/locations
  --key-out <path>      Optional. Writes the deploy service account key (a firebase-adminsdk-… key)
                        to this path, and grants that service account Service Usage Consumer and
                        Firebase Rules Admin. The key is what deploys the rules: the deploy step
                        (docs/household-setup.md step 5) reads it, and its contents are the
                        FIREBASE_SERVICE_ACCOUNT secret. It is a credential: keep it out of the repo.
                        A path inside the repo is refused, and an existing file is never overwritten.

Output: the web app's SDK config snippet (apiKey, authDomain, projectId, ...). It is how the upstream
app's Firebase SDK finds this project; paste it into the upstream app's setup screen.

Google sign-in and Authorized domains stay manual: see docs/household-setup.md.
`;
