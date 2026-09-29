export type DeploySteps = {
  readonly checkCredential: () => Promise<void> | void;
  readonly backfillReferenceCounts: () => Promise<void> | void;
  readonly deployRules: () => Promise<void> | void;
  readonly writePlatformMeta: () => Promise<void> | void;
};

/**
 * Orders a platform deploy so a failure never leaves `meta/platform` claiming a version whose
 * rules aren't live: the credential check runs first so bad credentials fail before anything
 * deploys, the referenceCount backfill runs next so every existing Shop and Category already
 * satisfies the new rules before they go live, the rules deploy runs after that, and
 * `meta/platform` is written last — only once the rules it describes are actually live.
 */
export async function runDeploy(steps: DeploySteps): Promise<void> {
  await steps.checkCredential();
  await steps.backfillReferenceCounts();
  await steps.deployRules();
  await steps.writePlatformMeta();
}
