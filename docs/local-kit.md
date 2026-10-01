# Local Household kit

Run an app against a local Household with no real Firebase project. The kit starts the Auth and
Firestore emulators with this repo's `firestore.rules`, seeds a named scenario, and ships in this
package as the `data-platform/local` export and the `data-platform-local` bin. It only ever uses
the `demo-data-platform-local` project ID, so it cannot touch a live Household.

The app installs `firebase`, `firebase-admin` and `firebase-tools` itself; they are peer
dependencies of this package, and Java must be on the PATH for the Firestore emulator.

## Start a scenario

```sh
npx data-platform-local owner-with-items
```

| Scenario           | Household                                             | Fake Google sign-in as |
| ------------------ | ----------------------------------------------------- | ---------------------- |
| `empty`            | unclaimed, nothing seeded                             | any new account        |
| `owner-with-items` | claimed; a Shop, Category, two Items, a CatalogueItem | `owner@example.com`, the Owner |
| `invited-member`   | claimed by another Owner; one Item                    | `member@example.com`, a Member |

An unknown name fails listing the known ones. With no name the bin starts `empty`. Auth listens on
`127.0.0.1:9099` and Firestore on `127.0.0.1:8090`.

## Connect the app

```ts
import { initializeApp } from "firebase/app";
import { connectLocal } from "data-platform/local";

const app = initializeApp({ projectId: "demo-data-platform-local", apiKey: "local" });
if (import.meta.env.DEV) connectLocal(app);
```

Call `connectLocal` before the app's first Auth or Firestore call. `seedScenario` and
`seedFixtures` are exported too; a fixture that fails its schema in `COLLECTION_SCHEMAS` throws
naming the collection and doc, before anything is written.
