import { AUTH_EMULATOR_PORT, EMULATOR_HOST, LOCAL_PROJECT_ID } from "./emulator-config.js";
/**
 * Creates each scenario user in the Auth emulator under the uid the scenario's `members/{uid}`
 * doc names, with their email verified and linked to the Google provider. The emulator's fake
 * Google sign-in as that email then resolves to this account instead of minting a fresh uid
 * that no Member doc belongs to.
 */
export async function seedAuthUsers(users, { projectId = LOCAL_PROJECT_ID, host = `${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}` } = {}) {
    if (users.length === 0)
        return;
    const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchCreate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
        body: JSON.stringify({
            users: users.map(({ uid, email }) => ({
                localId: uid,
                email,
                emailVerified: true,
                providerUserInfo: [
                    { providerId: "google.com", rawId: uid, federatedId: uid, email },
                ],
            })),
        }),
    });
    if (!response.ok) {
        throw new Error(`Seeding Auth emulator users failed: ${response.status} ${await response.text()}`);
    }
    const { error } = (await response.json());
    if (error?.length) {
        throw new Error(`Seeding Auth emulator users failed: ${JSON.stringify(error)}`);
    }
}
