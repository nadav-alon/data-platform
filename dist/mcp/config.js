import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { firebaseWebConfig } from "../client/web-config.js";
const googleClientIdSchema = z
    .string()
    .regex(/^[^\s]+\.apps\.googleusercontent\.com$/)
    .brand();
export function isGoogleClientId(value) {
    return googleClientIdSchema.safeParse(value).success;
}
export function googleClientId(value) {
    if (!isGoogleClientId(value))
        throw new Error(`Not a Google client id: ${JSON.stringify(value)}`);
    return value;
}
/** Thrown when the config is absent or malformed; the message says where it was looked for. */
export class ServerConfigError extends Error {
}
const configFileSchema = z.object({
    firebase: z.unknown(),
    oauthClient: z.object({
        clientId: googleClientIdSchema,
        clientSecret: z.string().min(1),
    }),
});
/** The directory holding the config file and the cached sign-in token. */
export function defaultConfigDir(env = process.env) {
    return env.DATA_PLATFORM_MCP_DIR ?? join(homedir(), ".config", "data-platform-mcp");
}
/**
 * Reads the config: the JSON in `DATA_PLATFORM_MCP_CONFIG_JSON` if set, else the file
 * `config.json` in {@link defaultConfigDir}. Throws {@link ServerConfigError} when it is missing or
 * malformed, naming the field and never the secret.
 */
export function readServerConfig(env = process.env, readFile = (path) => readFileSync(path, "utf8")) {
    const path = join(defaultConfigDir(env), "config.json");
    const source = env.DATA_PLATFORM_MCP_CONFIG_JSON ?? readOrNull(readFile, path);
    if (source === null) {
        throw new ServerConfigError(`No config: put it in ${path} or set DATA_PLATFORM_MCP_CONFIG_JSON (see the README)`);
    }
    let json;
    try {
        json = JSON.parse(source);
    }
    catch {
        throw new ServerConfigError("The config is not valid JSON");
    }
    const parsed = configFileSchema.safeParse(json);
    if (!parsed.success) {
        const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
        throw new ServerConfigError(`The config is missing or has bad fields: ${fields.join(", ")}`);
    }
    return { firebase: firebaseWebConfig(parsed.data.firebase), oauthClient: parsed.data.oauthClient };
}
function readOrNull(readFile, path) {
    try {
        return readFile(path);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return null;
        throw error;
    }
}
