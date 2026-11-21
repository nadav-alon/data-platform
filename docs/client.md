# Client helpers

`data-platform/client` is the browser code every app would otherwise copy: Firebase setup, the
stored web config, Google sign-in and the Household membership gate. It has no UI. `firebase` is an
optional peer dependency the app installs itself, and the main export never imports it
([ADR 0002](adr/0002-client-helpers-live-in-data-platform-client.md)).

## Start Firebase

```ts
import { initFirebase, getStoredFirebaseWebConfig } from "data-platform/client";

const config = getStoredFirebaseWebConfig();
if (config) {
  const { app, db } = initFirebase(config);
}
```

`initFirebase` shares a persistent Firestore cache across tabs and apps. Call it once per page.
To reset onto a different config, `await terminateFirebase(client)` first, then call `initFirebase`
again. Against the local kit, pass it in: `initFirebase(config, { local: localKit })`, see
[local-kit.md](local-kit.md).

## Web config

`firebaseWebConfig` and `isFirebaseWebConfig` build and check a `FirebaseWebConfig`. The config is
kept in `localStorage` with `saveFirebaseWebConfig`, `getStoredFirebaseWebConfig` (`null` when absent
or invalid) and `clearFirebaseWebConfig`. `deviceTransferUrl(pageUrl, config)` makes a `#config=` link
for a new device, and `parseConfigFragment(location.hash)` reads it back.

## Sign in and the membership gate

```ts
import {
  authClient,
  claimHousehold,
  householdExists,
  isHouseholdMember,
  joinFromInvite,
} from "data-platform/client";

const auth = authClient(app);
const user = await auth.signIn();
if (!(await isHouseholdMember(db, user.uid))) {
  if (!(await householdExists(db))) await claimHousehold(db, user.uid, user.email);
  else await joinFromInvite(db, user.uid, user.email); // false: no Invite
}
```

`authClient` gives `signIn`, `signOut`, `onAuthChange` and `currentUid`. `claimHousehold` makes the
signer the Owner of an unclaimed Household; `joinFromInvite` turns an Invite into Membership.
