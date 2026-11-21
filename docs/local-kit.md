# Local Household kit

Run an app against a local Household with no real Firebase project. The kit starts the Auth and
Firestore emulators with this repo's `firestore.rules`, seeds a named scenario, and ships in this
package as the `data-platform/local` export and the `data-platform-local` bin. It only ever uses
the `demo-data-platform-local` project ID, so it cannot touch a live Household.

A consumer that only uses `COLLECTION_SCHEMAS` installs none of this. To use the kit the app installs
`firebase`, `firebase-admin` and `firebase-tools` itself; they are optional peer dependencies of
this package, needed only for `data-platform/local`, and Java must be on the PATH for the Firestore
emulator.

## Start a scenario

```sh
npx data-platform-local owner-with-items
```

| Scenario           | Household                                                                                      | Fake Google sign-in as         |
| ------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| `empty`            | unclaimed, nothing seeded                                                                      | any new account                |
| `owner-with-items` | claimed; a Shop, Category, two Items, each with its CatalogueItem                              | `owner@example.com`, the Owner |
| `owner-with-recipes` | claimed; Items in every State plus a soft-deleted one, each with its CatalogueItem; a Recipe for every makeability case, a full-field one and a soft-deleted one | `owner@example.com`, the Owner |
| `invited-member`   | claimed by another Owner; a Shop, Category, one Item with its CatalogueItem; no Invite pending | `member@example.com`, a Member |

`owner-with-recipes` seeds Recipes that are Makeable, Almost makeable (one and two Missing Ingredients),
with an Unlinked, an Assumed and a `running low` Ingredient, and one linked to the soft-deleted Item.
It also seeds a full-field Recipe (prep steps, several steps, Ingredients with `quantity`, `unit` and
`prepNote`, `servings`, `sourceUrl`, `notes`) and a soft-deleted Recipe.

An unknown name fails listing the known ones. With no name the bin starts `empty`. Auth listens on
`127.0.0.1:9099` and Firestore on `127.0.0.1:8090`.

## Connect the app

```ts
import { initializeApp } from "firebase/app";
import { connectLocal, initLocalAuth } from "data-platform/local";

const app = initializeApp({ projectId: "demo-data-platform-local", apiKey: "local" });
if (import.meta.env.DEV) {
  initLocalAuth(app);
  connectLocal(app);
}
```

`initLocalAuth` creates the app's Auth with in-memory persistence, so every local run starts signed
out, and the browser popup resolver, so `signInWithPopup` works against the Auth emulator. Call it
after `initializeApp` and before the app's first Auth call, including `connectLocal`. An app that calls `initializeAuth` itself must
pass `popupRedirectResolver` too, or sign-in through the popup throws `auth/argument-error`.

An app that uses `initFirebase` from `data-platform/client` passes the kit instead of calling these itself:

```ts
import { initFirebase } from "data-platform/client";
import { LOCAL_WEB_CONFIG, localKit } from "data-platform/local";

const { app, db } = import.meta.env.DEV
  ? initFirebase(LOCAL_WEB_CONFIG, { local: localKit })
  : initFirebase(config);
```

`LOCAL_WEB_CONFIG` is the web config for local mode: its `projectId` is `LOCAL_PROJECT_ID`, which `initFirebase` requires with `local`, and its other fields are placeholders the emulators ignore.

An app that never imports `data-platform/local` ships none of the kit; `initFirebase` does not import it. The static import above drops out of a production build only because the package declares `"sideEffects": false` and the bundler folds `import.meta.env.DEV` to `false`; a bundler that ignores `sideEffects` may keep part of the kit, so check the production bundle.

Call `connectLocal` before the app's first Auth or Firestore call. The export is browser-safe: it
needs only `firebase` and `zod`, while the Admin SDK writer and Auth seeding stay inside the bin.
`seedScenario` and `seedFixtures` are exported too; a fixture that fails its schema in `COLLECTION_SCHEMAS` throws
naming the collection and doc, before anything is written.
