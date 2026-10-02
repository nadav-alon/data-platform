declare const webAppIdBrand: unique symbol;

/** A Firebase web app id (`1:<project number>:web:<hex>`), as passed to `firebase apps:sdkconfig`. */
export type WebAppId = string & { readonly [webAppIdBrand]: true };

const WEB_APP_ID_PATTERN = /^1:\d+:web:[0-9a-f]+$/;

export function isWebAppId(value: string): value is WebAppId {
  return WEB_APP_ID_PATTERN.test(value);
}

export function webAppId(value: string): WebAppId {
  if (!isWebAppId(value)) {
    throw new Error(`Not a Firebase web app id (expected 1:<number>:web:<hex>): ${value}`);
  }
  return value;
}
