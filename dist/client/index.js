export { initFirebase } from "./init-firebase.js";
export { firebaseWebConfig, InvalidFirebaseWebConfigError, isFirebaseWebConfig, } from "./web-config.js";
export { clearFirebaseWebConfig, FIREBASE_CONFIG_STORAGE_KEY, getStoredFirebaseWebConfig, saveFirebaseWebConfig, } from "./config-storage.js";
export { deviceTransferUrl, parseConfigFragment } from "./device-transfer.js";
