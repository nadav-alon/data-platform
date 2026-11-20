import { type FirebaseWebConfig } from "./web-config.ts";
/** `pageUrl` (typically `location.href`) with `config` as its `#config=` fragment, replacing any prior fragment, for a new device to open. */
export declare function deviceTransferUrl(pageUrl: string, config: FirebaseWebConfig): string;
/**
 * Extracts and validates the config carried by a `#config=` fragment, as produced by
 * {@link deviceTransferUrl}. Returns `null` when `hash` carries no such fragment at all; throws
 * {@link InvalidFirebaseWebConfigError} when the fragment is present but truncated or invalid.
 */
export declare function parseConfigFragment(hash: string): FirebaseWebConfig | null;
