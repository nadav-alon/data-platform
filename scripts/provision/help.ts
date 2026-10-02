/** What `--help` prints: where a newcomer gets each input, and what the output is for. */
export const HELP = `Provision a Household's Firebase project, Firestore database and web app.

Usage: npm run provision -- --project <id> --location <location>

Run \`npx firebase login\` first; the script stops before changing anything if the CLI is logged out.
A step that is already done is skipped, so re-running is safe.

Inputs (both required, no defaults):
  --project <id>        The id to create the Firebase project under. You choose it: 6-30 lowercase
                        letters, digits and hyphens, starting with a letter, not ending in a hyphen,
                        and unique across all of Google Cloud. The web app is named after it.
  --location <location> Where Firestore stores data, e.g. eur3 or europe-west1. It cannot be changed
                        later. Pick from https://firebase.google.com/docs/firestore/locations

Output: the web app's SDK config snippet (apiKey, authDomain, projectId, ...). It is how the upstream
app's Firebase SDK finds this project; paste it into the upstream app's setup screen.

Google sign-in and Authorized domains stay manual: see docs/household-setup.md.
`;
