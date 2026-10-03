import { type ScenarioName } from "./scenarios.ts";
/** The `firebase.json` the launcher hands the emulator suite: Auth and Firestore, with the platform's rules. */
export declare function emulatorConfig(rulesPath?: string): {
    firestore: {
        rules: string;
    };
    emulators: {
        auth: {
            host: string;
            port: number;
        };
        firestore: {
            host: string;
            port: number;
        };
        ui: {
            enabled: boolean;
        };
    };
};
/** The scenario named by the bin's arguments: `empty` when there are none. */
export declare function parseScenario(args: readonly string[]): ScenarioName;
/**
 * Starts the Auth and Firestore emulators with the platform's rules, seeds the named scenario,
 * and keeps running until the emulators exit or the process is interrupted. The scenario is
 * checked before anything starts, so an unknown name never boots an emulator.
 */
export declare function launchLocal(args: readonly string[]): Promise<void>;
