/** The IAM roles a deploy key's service account needs: `name` for output, `id` for `gcloud`. */
export const DEPLOY_ROLES = [
  { name: "Service Usage Consumer", id: "roles/serviceusage.serviceUsageConsumer" },
  { name: "Firebase Rules Admin", id: "roles/firebaserules.admin" },
] as const;

export type RoleId = (typeof DEPLOY_ROLES)[number]["id"];
