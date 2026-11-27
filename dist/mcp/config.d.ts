import { z } from "zod";
import { type FirebaseWebConfig } from "../client/web-config.ts";
declare const googleClientIdSchema: z.core.$ZodBranded<z.ZodString, "GoogleClientId", "out">;
/** The client id of a Google "Desktop app" OAuth client. */
export type GoogleClientId = z.infer<typeof googleClientIdSchema>;
export declare function isGoogleClientId(value: string): value is GoogleClientId;
export declare function googleClientId(value: string): GoogleClientId;
/** A Desktop app OAuth client: its secret is not confidential, Google issues one all the same. */
export type OAuthClient = {
    readonly clientId: GoogleClientId;
    readonly clientSecret: string;
};
/** What the server reads at start. */
export type ServerConfig = {
    /** The Household's Firebase web config. */
    readonly firebase: FirebaseWebConfig;
    /** The Household's "Desktop app" OAuth client, which signs the developer in. */
    readonly oauthClient: OAuthClient;
};
/** Thrown when the config is absent or malformed; the message says where it was looked for. */
export declare class ServerConfigError extends Error {
}
/** The directory holding the config file and the cached sign-in token. */
export declare function defaultConfigDir(env?: NodeJS.ProcessEnv): string;
/**
 * Reads the config: the JSON in `DATA_PLATFORM_MCP_CONFIG_JSON` if set, else the file
 * `config.json` in {@link defaultConfigDir}. Throws {@link ServerConfigError} when it is missing or
 * malformed, naming the field and never the secret.
 */
export declare function readServerConfig(env?: NodeJS.ProcessEnv, readFile?: (path: string) => string): ServerConfig;
export {};
