# data-platform

One Firebase store for side-project PWAs: zod schemas and security rules for every app's
collections, plus the `data-platform/client` helpers (`docs/client.md`) and the `data-platform/local`
kit (`docs/local-kit.md`). Standing a Household up is in `docs/household-setup.md`.

## MCP server: read and update the Household from Claude Code

A local stdio MCP server answers questions about the Household (its Items with their
State, its Recipes with their Ingredients and each Ingredient's linked Item) from a Claude Code
conversation, adds to it, sets an Item's State ("mark milk out"), and links an Ingredient to an
Item or marks it Assumed. It signs in with Google as your own Member, through a one-time browser
sign-in, so every read and write passes `firestore.rules`: no service account, no Admin SDK. A
soft-deleted record is never returned. The read tools return raw data; Claude works out what is
makeable or what to shop for.
The writes are `add_catalogue_item`, `add_food`, `log_food`, `add_recipe`, `set_item_state` and `set_ingredient_link`;
each is validated by the domain zod schemas before it is sent. `add_recipe` takes a structured
Recipe that Claude has read from a URL or pasted text (the server has no scraper). The server asks
no confirmation of its own: Claude Code's tool-permission prompt is the only one.
It runs from a clone of this repo; the published package has no bin for it.

| Tool                  | Returns                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_items`          | every live Item, with its State                                                                                                                                                     |
| `list_recipes`        | every live Recipe, with its Ingredients; each Ingredient's `item` is its linked live Item, or `null`                                                                                |
| `list_foods`          | every live Food, with its `place` and `perServing`                                                                                                                                  |
| `add_food`            | adds a Food from a name, optional place and serving label, per-serving Nutrition and `estimated` (true for a guess); returns its `id`                                              |
| `log_food`            | logs a Log Entry for the signed-in Member from a `foodId`, or a quick name and Nutrition; totals are per-serving Nutrition × `servings` (default 1); `mealType` is guessed from `eatenAt`'s local time (before 11:00 breakfast, before 16:00 lunch, after 21:30 snack, else dinner); returns its `id` |
| `add_catalogue_item`  | adds a new Item with its CatalogueItem (Category, Necessity, optional Shop override, Aisle, Tags); validated by the zod schemas first                                               |
| `add_recipe`          | adds a live Recipe with its Ingredients from structured input; validated by the Recipe zod schema first; returns its `id`                                                           |
| `set_item_state`      | sets one live Item's State and records it in State history, as the Catalogue app does                                                                                               |
| `set_ingredient_link` | links one Ingredient of a Recipe to an Item, marks it Assumed, or unlinks it; the input and the resulting Ingredients are validated by zod schemas first; returns the Recipe's `id` |

### One-time setup

1. In the Household's Google Cloud project (the Firebase project's), open APIs & Services →
   Credentials and create an **OAuth client ID** of type **Desktop app**. Note its client ID and
   client secret. (If the console asks for a consent screen first, configure it and add your own
   Google account as a test user.)
2. Put the config where the server reads it, in `~/.config/data-platform-mcp/config.json` (or in the
   directory named by `DATA_PLATFORM_MCP_DIR`; `DATA_PLATFORM_MCP_CONFIG_JSON` holds the same JSON
   inline instead of the file):

   ```json
   {
     "firebase": {
       "apiKey": "…",
       "authDomain": "…",
       "projectId": "…",
       "storageBucket": "…",
       "messagingSenderId": "…",
       "appId": "…"
     },
     "oauthClient": {
       "clientId": "….apps.googleusercontent.com",
       "clientSecret": "…"
     }
   }
   ```

   `firebase` is the Household's web app config, the one `npm run provision` prints.

3. From a clone, after `npm ci`, sign in once. A browser opens for Google; the server caches the
   refresh token in `tokens.json` beside the config, readable only by you:

   ```sh
   npm run mcp -- login
   ```

4. Register the server with Claude Code, with the absolute path of your clone:

   ```sh
   claude mcp add --scope user household -- node /path/to/data-platform/src/mcp/bin.ts
   ```

Your Google account has to be a Member of the Household; for anyone else every tool call fails with
the rules' `permission-denied`. If the cached sign-in is ever revoked, the server opens the browser
again on its next start.
