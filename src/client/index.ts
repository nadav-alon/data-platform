export { initFirebase } from "./init-firebase.ts";
export type { FirebaseClient, InitFirebaseOptions } from "./init-firebase.ts";
export {
  firebaseWebConfig,
  InvalidFirebaseWebConfigError,
  isFirebaseWebConfig,
} from "./web-config.ts";
export type { FirebaseWebConfig } from "./web-config.ts";
export {
  clearFirebaseWebConfig,
  FIREBASE_CONFIG_STORAGE_KEY,
  getStoredFirebaseWebConfig,
  saveFirebaseWebConfig,
} from "./config-storage.ts";
export type { ConfigStorage } from "./config-storage.ts";
export { deviceTransferUrl, parseConfigFragment } from "./device-transfer.ts";
export {
  claimHousehold,
  householdExists,
  isHouseholdMember,
  joinFromInvite,
} from "./household.ts";
export { isRulesRefusal } from "./rules-refusal.ts";
