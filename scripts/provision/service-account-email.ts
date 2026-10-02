declare const serviceAccountEmailBrand: unique symbol;

/** A service account's email, as `--member serviceAccount:<email>` and `--iam-account` take it. */
export type ServiceAccountEmail = string & { readonly [serviceAccountEmailBrand]: true };

const SERVICE_ACCOUNT_EMAIL_PATTERN = /^[a-z][a-z0-9-]+@[a-z][a-z0-9-]+\.iam\.gserviceaccount\.com$/;

export function isServiceAccountEmail(value: string): value is ServiceAccountEmail {
  return SERVICE_ACCOUNT_EMAIL_PATTERN.test(value);
}

export function serviceAccountEmail(value: string): ServiceAccountEmail {
  if (!isServiceAccountEmail(value)) {
    throw new Error(`Not a service account email (expected <name>@<project>.iam.gserviceaccount.com): ${value}`);
  }
  return value;
}
