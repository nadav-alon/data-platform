import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Firestore } from "firebase/firestore";
import { z } from "zod";
import { addCatalogueItem } from "./catalogue-writer.ts";
import { readItems, readRecipes } from "./household-reader.ts";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

/** One JSON text block: the raw records, with no derived view. */
function asJson(records: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
}

/**
 * The MCP server over one Household's Firestore. Its read tools return raw records: what is
 * makeable, and what to shop for, is left to the model to work out from them. `add_catalogue_item`
 * is its one write and asks for no confirmation of its own: Claude Code's tool-permission prompt is it. Connect it to a
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
        name: z.string(),
        state: z.string().optional(),
        categoryId: z.string(),
        necessity: z.string(),
        shopId: z.string().optional(),
        aisleId: z.string().optional(),
        tagIds: z.array(z.string()).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (input) => asJson({ id: await addCatalogueItem(db, input) }),
  );
  return server;
}
