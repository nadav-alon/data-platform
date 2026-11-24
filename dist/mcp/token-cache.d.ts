import { type GoogleRefreshToken } from "./google-oauth.ts";
/** Where the Google refresh token is kept between runs, so the browser sign-in happens once. */
export type TokenCache = {
    /** The cached refresh token, or `undefined` when none is cached or the file is unreadable. */
    readonly load: () => GoogleRefreshToken | undefined;
    readonly save: (refreshToken: GoogleRefreshToken) => void;
};
/** A cache in `tokens.json` under `dir`, readable by the developer only. */
export declare function fileTokenCache(dir: string): TokenCache;
