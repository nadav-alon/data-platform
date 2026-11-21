declare const emulatorHostBrand: unique symbol;

/** A `host:port` an emulator listens on, such as `127.0.0.1:8090` or `[::1]:8090`. */
export type EmulatorHost = string & { readonly [emulatorHostBrand]: true };

const EMULATOR_HOST_PATTERN = /^(\[[0-9a-fA-F:.]+\]|[^\s:[\]]+):(\d{1,5})$/;

/** The guard: a non-empty host (a bracketed IPv6 literal allowed) and a port from 1 to 65535. */
export function isEmulatorHost(value: string): value is EmulatorHost {
  const match = EMULATOR_HOST_PATTERN.exec(value);
  if (!match) return false;
  const port = Number(match[2]);
  return port >= 1 && port <= 65535;
}

/** The constructor: narrows, or throws naming the offending value. */
export function emulatorHost(value: string): EmulatorHost {
  if (!isEmulatorHost(value))
    throw new Error(`Not an EmulatorHost: ${JSON.stringify(value)}`);
  return value;
}

/** Splits an {@link EmulatorHost} into the host and numeric port the Firebase SDK wants. */
export function splitEmulatorHost(value: EmulatorHost): {
  host: string;
  port: number;
} {
  const at = value.lastIndexOf(":");
  return { host: value.slice(0, at), port: Number(value.slice(at + 1)) };
}
