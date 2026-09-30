import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "node:net";
import { withEmulatorWriter } from "./admin-writer.ts";
import { seedAuthUsers } from "./auth-users.ts";
import {
  AUTH_EMULATOR_PORT,
  EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  LOCAL_PROJECT_ID,
} from "./emulator-config.ts";
import { knownScenarios, scenarioName, seedScenario, type ScenarioName } from "./scenarios.ts";

/**
 * firebase-tools' own entry point, resolved from the app's install: the bin may run outside an
 * npm script, where `firebase` is not on the PATH.
 */
const FIREBASE_CLI = createRequire(import.meta.url).resolve("firebase-tools/lib/bin/firebase.js");

/** The platform's own `firestore.rules`, two levels above `src/local/` and `dist/local/` alike. */
const RULES_PATH = fileURLToPath(new URL("../../firestore.rules", import.meta.url));

/** The `firebase.json` the launcher hands the emulator suite: Auth and Firestore, with the platform's rules. */
export function emulatorConfig(rulesPath: string = RULES_PATH) {
  return {
    firestore: { rules: rulesPath },
    emulators: {
      auth: { host: EMULATOR_HOST, port: AUTH_EMULATOR_PORT },
      firestore: { host: EMULATOR_HOST, port: FIRESTORE_EMULATOR_PORT },
      ui: { enabled: false },
    },
  };
}

/** The scenario named by the bin's arguments: `empty` when there are none. */
export function parseScenario(args: readonly string[]): ScenarioName {
  const [name = "empty", ...extra] = args;
  if (extra.length > 0) {
    throw new Error(`Usage: data-platform-local [scenario]; known scenarios: ${knownScenarios()}`);
  }
  return scenarioName(name);
}

function waitForPort(port: number, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = connect(port, EMULATOR_HOST);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error(`Emulator on port ${port} never came up`));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

/**
 * Starts the Auth and Firestore emulators with the platform's rules, seeds the named scenario,
 * and keeps running until the emulators exit or the process is interrupted. The scenario is
 * checked before anything starts, so an unknown name never boots an emulator.
 */
export async function launchLocal(args: readonly string[]): Promise<void> {
  const name = parseScenario(args);

  const configDir = mkdtempSync(join(tmpdir(), "data-platform-local-"));
  const configPath = join(configDir, "firebase.json");
  writeFileSync(configPath, JSON.stringify(emulatorConfig()));

  const emulators = spawn(
    process.execPath,
    [
      FIREBASE_CLI,"emulators:start", "--only", "auth,firestore", "--project", LOCAL_PROJECT_ID, "--config", configPath],
    { stdio: "inherit" },
  );
  const exited = new Promise<number>((resolve) => {
    emulators.once("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
    emulators.once("exit", (code) => resolve(code ?? 1));
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => emulators.kill(signal));
  }

  try {
    await Promise.race([
      Promise.all([waitForPort(FIRESTORE_EMULATOR_PORT), waitForPort(AUTH_EMULATOR_PORT)]),
      exited.then((code) => {
        throw new Error(`firebase emulators exited with code ${code} before they were ready`);
      }),
    ]);
    const { users } = await withEmulatorWriter((writer) => seedScenario(writer, name));
    await seedAuthUsers(users);
    console.log(`\nSeeded scenario "${name}" into ${LOCAL_PROJECT_ID}.`);
    for (const { email, role } of users) {
      console.log(`Sign in with Google as ${email} to be the ${role}.`);
    }
    process.exitCode = await exited;
  } catch (error) {
    emulators.kill("SIGTERM");
    await exited;
    throw error;
  } finally {
    rmSync(configDir, { recursive: true, force: true });
  }
}
