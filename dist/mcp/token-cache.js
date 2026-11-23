import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { googleRefreshToken, isGoogleRefreshToken, } from "./google-oauth.js";
const cacheFileSchema = z.object({ refreshToken: z.string().refine(isGoogleRefreshToken) });
/** A cache in `tokens.json` under `dir`, readable by the developer only. */
export function fileTokenCache(dir) {
    const path = join(dir, "tokens.json");
    return {
        load() {
            try {
                const parsed = cacheFileSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
                return parsed.success ? googleRefreshToken(parsed.data.refreshToken) : undefined;
            }
            catch {
                return undefined;
            }
        },
        save(refreshToken) {
            mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
            writeFileSync(path, JSON.stringify({ refreshToken }), { mode: 0o600 });
            chmodSync(path, 0o600);
        },
    };
}
