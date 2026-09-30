import { initializeApp, deleteApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { EMULATOR_HOST, FIRESTORE_EMULATOR_PORT, LOCAL_PROJECT_ID } from "./emulator-config.ts";
import type { FixtureWriter } from "./seed.ts";

function isTimestampShape(value: unknown): value is { seconds: number; nanoseconds: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 2 &&
    "seconds" in value &&
    "nanoseconds" in value
  );
}

/** Fixtures hold timestamps in the shape reads return; Firestore must store them as Timestamps. */
function toStoredData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      isTimestampShape(value) ? new Timestamp(value.seconds, value.nanoseconds) : value,
    ]),
  );
}

/**
 * A {@link FixtureWriter} against the local Firestore emulator. Admin SDK writes bypass the
 * rules, which is how a scenario starts from a claimed Household. Always points at the emulator,
 * never a real project (`projectId` only names which emulator project); the SDK app is released once `use` settles.
 */
export async function withEmulatorWriter<T>(
  use: (writer: FixtureWriter) => Promise<T>,
  { projectId = LOCAL_PROJECT_ID, host = `${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}` } = {},
): Promise<T> {
  process.env.FIRESTORE_EMULATOR_HOST = host;
  const app = initializeApp({ projectId }, `local-seed-${Date.now()}`);
  try {
    const db = getFirestore(app);
    return await use({
      async set(path, data) {
        await db.doc(path).set(toStoredData(data));
      },
    });
  } finally {
    await deleteApp(app);
  }
}
