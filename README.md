# data-platform

One Firebase store for side-project PWAs: zod schemas and security rules for every app's
collections, plus the `data-platform/client` helpers (`docs/client.md`) and the `data-platform/local`
kit (`docs/local-kit.md`). Standing a Household up is in `docs/household-setup.md`.

## MCP server: read and add to the Household from Claude Code

A local stdio MCP server answers questions about the Household (its Items with their
State, its Recipes with their Ingredients and each Ingredient's linked Item) from a Claude Code
conversation. It signs in with Google as your own Member, through a one-time browser sign-in, so
every read and write passes `firestore.rules`: no service account, no Admin SDK. A soft-deleted record is
never returned. The tools return raw data; Claude works out what is makeable or what to shop for.
The one write, `add_catalogue_item`, has no confirmation of its own: Claude Code's tool-permission
prompt is the only one.
It runs from a clone of this repo; the published package has no bin for it.

| Tool           | Returns                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `list_items`   | every live Item, with its State                                                                      |
| `list_recipes` | every live Recipe, with its Ingredients; each Ingredient's `item` is its linked live Item, or `null` |
| `add_catalogue_item` | adds a new Item with its CatalogueItem (Category, Necessity, optional Shop override, Aisle, Tags); validated by the zod schemas first |

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
