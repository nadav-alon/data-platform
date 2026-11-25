declare const emulatorHostBrand: unique symbol;
/** A `host:port` an emulator listens on, such as `127.0.0.1:8090` or `[::1]:8090`. */
export type EmulatorHost = string & {
    readonly [emulatorHostBrand]: true;
};
/** The guard: a non-empty host (a bracketed IPv6 literal allowed) and a port from 1 to 65535. */
export declare function isEmulatorHost(value: string): value is EmulatorHost;
/** The constructor: narrows, or throws naming the offending value. */
export declare function emulatorHost(value: string): EmulatorHost;
/** Splits an {@link EmulatorHost} into the host and numeric port the Firebase SDK wants. */
export declare function splitEmulatorHost(value: EmulatorHost): {
    host: string;
    port: number;
};
export {};
