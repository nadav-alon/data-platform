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
await setIngredientBought(db, recipeId, "Flour", true); // the Ingredient named "Flour"
await setRecipeWanted(db, recipeId, false); // also clears every Bought
```

`setRecipeWanted` is a transaction: it sets or clears a live Recipe's `wanted`, and not Wanted clears
`boughtIngredients` in the same write. It throws for an unknown or soft-deleted Recipe.

`setIngredientBought` sets or clears one Ingredient's Bought, keyed by the Ingredient's name in the
Recipe's `boughtIngredients` map, so a reorder of the Recipe's Ingredients cannot move it. It is one
field write with no read, so it works offline: the local cache changes at once and the write reaches
the server when the connection returns. Do not wait on the promise to update the screen; it settles
only once the server answers. Because nothing is read, the client does not refuse a Recipe that is not
Wanted or an Ingredient that is Linked or Assumed: the rules do, and the write rejects with
`permission-denied` when it reaches the server. The rules can check only the first Ingredient for
Linked or Assumed, so a caller should tick Unlinked Ingredients only. Clearing the last Bought leaves
an empty `boughtIngredients`, which reads as none. The rules refuse a non-Member.

## Linking an Ingredient to an Item

```ts
import { linkIngredientToItem } from "data-platform/client";

await linkIngredientToItem(db, recipeId, { position: 2, name: "Flour" }, itemId);
```

`linkIngredientToItem` links one Unlinked Ingredient to an Item and drops its name from the Recipe's
`boughtIngredients` unless another Unlinked Ingredient of that name remains. The caller
names the Ingredient by the position and name it saw; it throws, changing nothing, when that
position no longer holds an Ingredient of that name or the Ingredient is already Linked or
Assumed. Only the name is compared, so a swap of two same-named Ingredients, or an edit that keeps
the name, is not detected. It also throws for an unknown or soft-deleted Recipe.

It reads the Recipe (the cache when offline) and writes the Ingredients in one field write, not a
transaction: offline the link applies to the local cache at once and reaches the server on
reconnect, and the returned promise settles only once the server has answered. Do not wait on the
promise to update the screen: offline it does not settle until reconnect. Offline, the read rejects
with code `unavailable` when the Recipe is not in the local cache, and nothing is queued. Those
checks run against what was read, so an edit to the Recipe made in between is overwritten, and a
Recipe soft-deleted in between is still linked: the rules accept an `ingredients` change on a
soft-deleted Recipe. The rules cannot repeat the checks; the existing first-Ingredient rule still
refuses a link write that does not drop that Ingredient's Bought.

### Several Ingredients at once

```ts
import { linkIngredientsToItem } from "data-platform/client";

await linkIngredientsToItem(
  db,
  recipeId,
  [
    { position: 0, name: "Flour" },
    { position: 3, name: "Flour" },
  ],
  itemId,
);
```

`linkIngredientsToItem` links every given Ingredient to the Item in one field write, dropping the
Bought of each name as `linkIngredientToItem` does, so same-named Ingredients linked together do
not overwrite one another as two separate calls would. It is all or nothing: it throws, changing
nothing, naming every stale position, meaning one that no longer holds an Ingredient of that name or
whose Ingredient is already Linked or Assumed. It also throws for a repeated or negative position and
for an unknown or soft-deleted Recipe; an empty list writes nothing. The offline behaviour is that of
`linkIngredientToItem`: one read of the Recipe (the cache when offline, `unavailable` when it is not
cached), then one write that applies to the local cache at once and settles only once the server has
answered, so do not wait on it to update the screen. The checks run against what was read, so an
edit made in between is overwritten.

## The Shop for Recipe Ingredients

```ts
import { setRecipeIngredientShop, watchRecipeIngredientShop } from "data-platform/client";

const stop = watchRecipeIngredientShop(db, (shopId) => render(shopId)); // undefined: unset
await setRecipeIngredientShop(db, shopId("grocery"));
await setRecipeIngredientShop(db, undefined); // clears it
```

The Household keeps it in `meta/settings` as `recipeIngredientShopId`. Any Member may set it; a Shop
that is missing or soft-deleted rejects with `UnknownShopError`, and the rules refuse it too.
