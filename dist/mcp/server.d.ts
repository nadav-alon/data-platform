import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Firestore } from "firebase/firestore";
/**
 * The MCP server over one Household's Firestore. Its read tools return raw records: what is
 * makeable, and what to shop for, is left to the model to work out from them. Its writes,
 * `add_catalogue_item`, `add_recipe`, `set_item_state` and `set_ingredient_link`, ask for no
 * confirmation of their own: the client's tool permission prompt is the only one. Connect it to a
 * transport with `server.connect`.
 */
export declare function createHouseholdServer(db: Firestore): McpServer;
