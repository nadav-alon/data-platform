import type { ScenarioUser } from "./scenarios.ts";
/**
 * Creates each scenario user in the Auth emulator under the uid the scenario's `members/{uid}`
 * doc names, with their email verified and linked to the Google provider. The emulator's fake
 * Google sign-in as that email then resolves to this account instead of minting a fresh uid
 * that no Member doc belongs to.
 */
export declare function seedAuthUsers(users: readonly ScenarioUser[], { projectId, host }?: {
    host?: string | undefined;
    projectId?: string | undefined;
}): Promise<void>;
