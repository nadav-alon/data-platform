import type { FixtureWriter } from "./seed.ts";
/**
 * A {@link FixtureWriter} against the local Firestore emulator. Admin SDK writes bypass the
 * rules, which is how a scenario starts from a claimed Household. Always points at the emulator,
 * never a real project (`projectId` only names which emulator project); the SDK app is released once `use` settles.
 */
export declare function withEmulatorWriter<T>(use: (writer: FixtureWriter) => Promise<T>, { projectId, host }?: {
    host?: string | undefined;
    projectId?: string | undefined;
}): Promise<T>;
