# Client helpers

`data-platform/client` is the browser code every app would otherwise copy: Firebase setup, the
stored web config, Google sign-in and the Household membership gate. It has no UI. `firebase` is an
optional peer dependency the app installs itself, and the main export never imports it
([ADR 0002](adr/0002-client-helpers-live-in-data-platform-client.md)).

## Start Firebase

```ts
import {
  initFirebase,
  getStoredFirebaseWebConfig,
  terminateFirebase,
} from "data-platform/client";
import { localKit } from "data-platform/local";

const config = getStoredFirebaseWebConfig();
if (!config) return;
const client = initFirebase(config);
const { app, db } = client;
```

`initFirebase` shares a persistent Firestore cache across tabs and apps, but only when every app on
the origin initializes through this release with the default Firebase app name; an app that misses
that falls back to a memory cache. They also share one Auth session. Call it once per page. To
reset onto a different config, `await terminateFirebase(client)` first, then call `initFirebase`
again. Against the local kit, pass it in: `initFirebase(config, { local: localKit })`, see
[local-kit.md](local-kit.md).

## Web config

`firebaseWebConfig` and `isFirebaseWebConfig` build and check a `FirebaseWebConfig`. The config is
kept in `localStorage` with `saveFirebaseWebConfig`, `getStoredFirebaseWebConfig` (`null` when
absent or invalid) and `clearFirebaseWebConfig`. `deviceTransferUrl(pageUrl, config)` makes a
`#config=` link for a new device, and `parseConfigFragment(location.hash)` reads it back.

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
  if (!(await householdExists(db)))
    await claimHousehold(db, user.uid, user.email);
  else await joinFromInvite(db, user.uid, user.email); // false: no Invite, or the rules refused
}
```

`authClient` gives `signIn`, `signOut`, `onAuthChange` and `currentUid`. `claimHousehold` makes the
signer the Owner of an unclaimed Household; `joinFromInvite` turns an Invite into Membership.
`isRulesRefusal(error)` is true when a Firestore call failed because the rules denied it, rather than
a network or programming error.

## Wanted Recipes

```ts
import { setRecipeWanted, setIngredientBought } from "data-platform/client";

await setRecipeWanted(db, recipeId, true);
await setIngredientBought(db, recipeId, 0, true); // Ingredient 0 of the Recipe
await setRecipeWanted(db, recipeId, false); // also clears every Ingredient's `bought`
```

`setRecipeWanted` sets or clears a live Recipe's `wanted`; not Wanted clears `bought` from every
Ingredient in the same write. `setIngredientBought` sets or clears one Ingredient's `bought` by its
0-based position, and throws on a Recipe that is not Wanted or an Ingredient that is Linked or
Assumed. Both throw for an unknown or soft-deleted Recipe, and the rules refuse a non-Member.

## The Shop for Recipe Ingredients

```ts
import { setRecipeIngredientShop, watchRecipeIngredientShop } from "data-platform/client";

const stop = watchRecipeIngredientShop(db, (shopId) => render(shopId)); // undefined: unset
await setRecipeIngredientShop(db, shopId("grocery"));
await setRecipeIngredientShop(db, undefined); // clears it
```

The Household keeps it in `meta/settings` as `recipeIngredientShopId`. Any Member may set it; a Shop
that is missing or soft-deleted rejects with `UnknownShopError`, and the rules refuse it too.
