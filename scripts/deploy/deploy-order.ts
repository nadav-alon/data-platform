export type DeploySteps = {
  readonly checkCredential: () => Promise<void> | void;
  readonly deployRules: () => Promise<void> | void;
  readonly writeMeta: () => Promise<void> | void;
};

/**
 * Orders a platform deploy so a failure never leaves `meta/platform` claiming a version whose
 * rules aren't live: the credential check runs first so bad credentials fail before anything
 * deploys, the rules deploy runs next, and `meta/platform` is written last — only once the rules
 * it describes are actually live.
 */
export async function runDeploy(steps: DeploySteps): Promise<void> {
  await steps.checkCredential();
  await steps.deployRules();
  await steps.writeMeta();
}
