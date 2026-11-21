#!/usr/bin/env node
import { spawn } from "node:child_process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { defaultConfigDir, readServerConfig } from "./config.ts";
import { openMemberSession } from "./member-session.ts";
import { createHouseholdServer } from "./server.ts";
import { fileTokenCache } from "./token-cache.ts";

/** Opens `url` in the developer's browser; the URL is also printed, as a fallback. stdout is the MCP channel, so everything printed goes to stderr. */
function openUrl(url: string): void {
  console.error(`Sign in with Google: ${url}`);
  const [command, ...args] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url.replaceAll("&", "^&")]
        : ["xdg-open", url];
  spawn(command as string, args, { stdio: "ignore", detached: true })
    .on("error", () => {})
    .unref();
}

/**
 * This entry point (`npm run mcp`) serves the Household over stdio, for `claude mcp add`. With the
 * argument `login` it only runs the one-time browser sign-in and caches it, then exits.
 */
async function main(): Promise<void> {
  const config = readServerConfig();
  const { db } = await openMemberSession(config, {
    fetch,
    openUrl,
    tokenCache: fileTokenCache(defaultConfigDir()),
    log: (message) => console.error(message),
  });
  if (process.argv[2] === "login") {
    console.error("Signed in; the sign-in is cached.");
    process.exit(0);
  }
  await createHouseholdServer(db).connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
