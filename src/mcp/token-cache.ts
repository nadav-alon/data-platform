import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

/** Where the Google refresh token is kept between runs, so the browser sign-in happens once. */
export type TokenCache = {
  /** The cached refresh token, or `undefined` when none is cached or the file is unreadable. */
  readonly load: () => string | undefined;
  readonly save: (refreshToken: string) => void;
};

const cacheFileSchema = z.object({ refreshToken: z.string().min(1) });

/** A cache in `tokens.json` under `dir`, readable by the developer only. */
export function fileTokenCache(dir: string): TokenCache {
  const path = join(dir, "tokens.json");
  return {
    load() {
      try {
        const parsed = cacheFileSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
        return parsed.success ? parsed.data.refreshToken : undefined;
      } catch {
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
