import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readItems, readRecipes } from "./household-reader.js";
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
/** One JSON text block: the raw records, with no derived view. */
function asJson(records) {
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
}
/**
 * The MCP server over one Household's Firestore, read only. Its tools return raw records: what is
 * makeable, and what to shop for, is left to the model to work out from them. Connect it to a
 * transport with `server.connect`.
 */
export function createHouseholdServer(db) {
    const server = new McpServer({ name: "data-platform-household", version: "0.1.0" });
    server.registerTool("list_items", {
        description: "Every live Item in the Household with its State (enough, running low or out). Soft-deleted Items are left out.",
        annotations: READ_ONLY,
    }, async () => asJson(await readItems(db)));
    server.registerTool("list_recipes", {
        description: "Every live Recipe with its Ingredients, steps and notes. Each Ingredient carries `item`, the live Item it links to with its State, or null when it names none (unlinked or assumed) or names a soft-deleted one. Soft-deleted Recipes are left out.",
        annotations: READ_ONLY,
    }, async () => asJson(await readRecipes(db)));
    return server;
}
