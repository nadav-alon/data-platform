import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Firestore } from "firebase/firestore";
/**
 * The MCP server over one Household's Firestore, read only. Its tools return raw records: what is
 * makeable, and what to shop for, is left to the model to work out from them. Connect it to a
 * transport with `server.connect`.
 */
export declare function createHouseholdServer(db: Firestore): McpServer;
