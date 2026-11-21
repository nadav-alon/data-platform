import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Firestore } from "firebase/firestore";
import { catalogueItemSchema } from "../catalogue/catalogue-item.ts";
import { itemIdSchema, itemSchema } from "../core/item.ts";
import { addCatalogueItem } from "./catalogue-writer.ts";
import { setIngredientLink, setIngredientLinkSchema } from "./ingredient-writer.ts";
import { readItems, readRecipes } from "./household-reader.ts";
import { addRecipe, newRecipeSchema } from "./recipe-writer.ts";
import { stateSchema } from "../core/state.ts";
import { setItemState } from "./household-writer.ts";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;
const UPDATES = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;
const ADDS_ONLY = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

/** One JSON text block: the raw records, with no derived view. */
function asJson(records: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
}

/**
 * The MCP server over one Household's Firestore. Its read tools return raw records: what is
 * makeable, and what to shop for, is left to the model to work out from them. Its writes,
 * `add_catalogue_item`, `add_recipe`, `set_item_state` and `set_ingredient_link`, ask for no
 * confirmation of their own: the client's tool permission prompt is the only one. Connect it to a
 * transport with `server.connect`.
 */
export function createHouseholdServer(db: Firestore): McpServer {
  const server = new McpServer({ name: "data-platform-household", version: "0.1.0" });
  server.registerTool(
    "list_items",
    {
      description:
        "Every live Item in the Household with its State (enough, running low or out). Soft-deleted Items are left out.",
      annotations: READ_ONLY,
    },
    async () => asJson(await readItems(db)),
  );
  server.registerTool(
    "list_recipes",
    {
      description:
        "Every live Recipe with its Ingredients, steps and notes. Each Ingredient carries `item`, the live Item it links to with its State, or null when it names none (unlinked or assumed) or names a soft-deleted one. Soft-deleted Recipes are left out.",
      annotations: READ_ONLY,
    },
    async () => asJson(await readRecipes(db)),
  );
  server.registerTool(
    "add_catalogue_item",
    {
      description:
        "Add a new Item to the Household's catalogue. `state` is enough, running low or out (default enough); `necessity` is essential, important or optional; `categoryId` names a live Category, and `shopId`, when given, a live Shop overriding the Category's default. Returns the new Item's id.",
      inputSchema: {
        name: itemSchema.shape.name,
        state: itemSchema.shape.state.optional(),
        categoryId: catalogueItemSchema.shape.categoryId,
        necessity: catalogueItemSchema.shape.necessity,
        shopId: catalogueItemSchema.shape.shopId,
        aisleId: catalogueItemSchema.shape.aisleId,
        tagIds: catalogueItemSchema.shape.tagIds.optional(),
      },
      annotations: ADDS_ONLY,
    },
    async (input) => asJson({ id: await addCatalogueItem(db, input) }),
  );
  server.registerTool(
    "add_recipe",
    {
      description:
        "Add a Recipe with its Ingredients to the Household. Read the source (a URL or pasted text) first and pass the Recipe as structured input; the server fetches nothing. An Ingredient may link an Item by an `itemId` from list_items; an assumed Ingredient (a staple such as salt) names no Item; a `unit` needs a `quantity`. Returns the new Recipe's id.",
      inputSchema: newRecipeSchema,
      annotations: ADDS_ONLY,
    },
    async (recipe) => asJson({ id: await addRecipe(db, recipe) }),
  );
  server.registerTool(
    "set_item_state",
    {
      description:
        "Set one live Item's State, recording it in the Item's State history. Use an Item id from list_items.",
      inputSchema: { itemId: itemIdSchema, state: stateSchema },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ itemId: id, state }) => {
      try {
        await setItemState(db, id, state);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }] };
      }
      return { content: [{ type: "text", text: `Set ${id} to ${state}.` }] };
    },
  );
  server.registerTool(
    "set_ingredient_link",
    {
      description:
        "Change what one Ingredient of a live Recipe points at. `ingredient` is its 0-based position in the Recipe's Ingredients (see list_recipes). `link` is `{ itemId }` to link it to an Item from list_items, `{ assumed: true }` to mark it a staple taken as already in the house, or `{}` to unlink it. Its other fields are kept. Returns the Recipe's id.",
      inputSchema: setIngredientLinkSchema,
      annotations: UPDATES,
    },
    async (input) => asJson({ id: await setIngredientLink(db, input) }),
  );
  return server;
}
