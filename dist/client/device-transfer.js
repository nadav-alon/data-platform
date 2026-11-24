import { firebaseWebConfig, InvalidFirebaseWebConfigError, } from "./web-config.js";
const FRAGMENT_KEY = "config";
const FRAGMENT_PREFIX = `#${FRAGMENT_KEY}=`;
function toBase64Url(json) {
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
/** `pageUrl` (typically `location.href`) with `config` as its `#config=` fragment, replacing any prior fragment, for a new device to open. */
export function deviceTransferUrl(pageUrl, config) {
    const url = new URL(pageUrl);
    url.hash = `${FRAGMENT_KEY}=${toBase64Url(JSON.stringify(config))}`;
    return url.toString();
}
/**
 * Extracts and validates the config carried by a `#config=` fragment, as produced by
 * {@link deviceTransferUrl}. Returns `null` when `hash` carries no such fragment at all; throws
 * {@link InvalidFirebaseWebConfigError} when the fragment is present but truncated or invalid.
 */
export function parseConfigFragment(hash) {
    if (!hash.startsWith(FRAGMENT_PREFIX))
        return null;
    let parsed;
    try {
        parsed = JSON.parse(fromBase64Url(hash.slice(FRAGMENT_PREFIX.length)));
    }
    catch {
        throw new InvalidFirebaseWebConfigError("That device transfer link is truncated or corrupted.");
    }
    return firebaseWebConfig(parsed);
}
