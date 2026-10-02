# Can Terraform provision a Household's Firebase project on the free plan?

Research for [#219](https://github.com/nadav-alon/data-platform/issues/219). Findings only; nothing
here is implemented. Sources were read on 2026-10-02. Where a source did not state something, the
finding says so rather than filling the gap from memory.

## Recommendation

**A CLI script for the steps the CLIs cover, with Google sign-in (steps 3 and 4) staying manual.**
Not Terraform: the Terraform route to Google sign-in needs a billing-enabled project, which rules
out Spark, and it still needs an OAuth client the provider cannot create.

| `docs/household-setup.md` step | Terraform on Spark | CLI script on Spark |
| --- | --- | --- |
| 1 Project + Firebase | Possible | `firebase projects:create` |
| 2 Firestore | Possible | `gcloud firestore databases create --location=…` |
| 3 Google sign-in provider | **No** (needs billing) | Stays manual |
| 4 Authorized domains | **No** (same resource as 3) | Stays manual |
| 5 Deploy key and its two roles | Partial: roles only; the key is not produced (`google_service_account_key` would put it in state) | `gcloud iam service-accounts keys create` and `gcloud projects add-iam-policy-binding`; flags per the reference pages, not run against a `firebase-adminsdk-…` account |
| Web app + config snippet (missing from the doc) | Possible | `firebase apps:create WEB`, `firebase apps:sdkconfig` |
| Rules ruleset + release | Possible, but duplicates `npm run deploy` | Already `npm run deploy` |

## 1. Billing: does Google sign-in through Terraform need Blaze?

**Yes, in practice.**

- Firebase's Terraform guide lists "Firebase Authentication with GCIP" under the features that
  require Blaze, with the wording "The project must have an associated Cloud Billing account", and
  says configuring Firebase Authentication through Terraform requires enabling Google Cloud Identity
  Platform (GCIP) via `google_identity_platform_config`.
  <https://firebase.google.com/docs/projects/terraform/get-started>
- The provider docs for `google_identity_platform_config` say the resource is only available in
  billing-enabled projects.
  <https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/identity_platform_config>
  (read through its source,
  `website/docs/r/identity_platform_config.html.markdown` in `hashicorp/terraform-provider-google`)
- The same guide lists Cloud Firestore and Security Rules deployment as Spark-compatible.
- Firebase pricing shows Authentication at 50K MAUs on Spark with no payment method required, so the
  console path in step 3 stays free. It is the Terraform path that adds the billing requirement.
  <https://firebase.google.com/pricing>

Not settled: I could not retrieve the Identity Platform pricing page (the fetch returned no
content), so I have no primary-source statement on whether merely calling the Identity Toolkit
Admin API directly, without Terraform, is refused on a project with no billing account.

## 2. OAuth client: can it be created by API or Terraform?

**No supported route.**

- `google_identity_platform_default_supported_idp_config` takes `client_id` and `client_secret` as
  required arguments, and says the Identity Platform service must be activated in the marketplace
  first. The provider creates nothing that mints those values.
  `website/docs/r/identity_platform_default_supported_idp_config.html.markdown`
- The IAP OAuth Admin API is gone, not merely deprecated: "The IAP OAuth Admin API was shut down on
  March 19, 2026. You can no longer create or manage OAuth brands or clients programmatically using
  this API."
  <https://docs.cloud.google.com/iap/docs/programmatic-oauth-clients>
- Firebase's own guide for the console flow says to enable Google under Authentication → Sign-in
  method, and points at the Credentials page for the Google Client ID.
  <https://firebase.google.com/docs/auth/web/google-signin>

So a Terraform-managed Google provider would still need the client created by hand in the console and
its secret pasted into Terraform variables, and that secret lands in state in plain text (the
provider docs warn that sensitive values are stored in raw state). That is more manual work than the
console's one-click enable, not less.

## 3. Coverage: which resources cover which step

All from `hashicorp/terraform-provider-google` docs unless noted.

| Need | Resource | Finding |
| --- | --- | --- |
| Project + Firebase | `google_project`, `google_firebase_project` | Firebase guide states no billing requirement for the resource itself |
| Firestore | `google_firestore_database` (`location_id`, `type = FIRESTORE_NATIVE`) | Docs do not mention Spark; the Firebase guide lists Firestore as Spark-compatible |
| Authorized domains | `google_identity_platform_config.authorized_domains` | Billing-enabled projects only (point 1) |
| Deploy service account roles | `google_project_iam_member` | Takes any `serviceAccount:{email}`, but the docs say nothing about `firebase-adminsdk-…`; its email is only known after Firebase creates it |
| Web app | `google_firebase_web_app` | Covered |
| Config snippet | `google_firebase_web_app_config` data source | Returns `api_key`, `auth_domain`, `storage_bucket`, `messaging_sender_id`, `measurement_id` |
| Rules ruleset/release | `google_firebaserules_ruleset`, `google_firebaserules_release` (`name = "cloud.firestore"`) | Covered, but a second owner of the rules next to `npm run deploy` |

Two gaps beyond billing: the Firebase quickstart URL (`/docs/terraform/terraform-quickstart`) returns
404, so the get-started guide above is the Firebase-side source; and none of the resources in the
table produce the deploy key in step 5. `google_service_account_key` is the Terraform resource that
creates a service account key, but the key it creates would be stored in Terraform state in plain
text, the same hazard as the OAuth secret in point 2, and no source states whether it works on the
Firebase-managed `firebase-adminsdk-…` account.

## 4. Alternative: CLIs, no Terraform state, still on Spark

- `firebase projects:create`, `projects:addfirebase`, `apps:create` and `apps:sdkconfig` are in the
  Firebase CLI command table ("Create a new Firebase app in a project", "Print the configuration of
  a Firebase app"). <https://github.com/firebase/firebase-tools> (`README.md`)
- That same table has no command for Firestore database creation and none for authentication
  providers or sign-in methods. Firestore is covered by
  `gcloud firestore databases create --location=<region>` (default type `firestore-native`).
  <https://docs.cloud.google.com/sdk/gcloud/reference/firestore/databases/create>
- Granting the two roles in step 5 is an IAM binding on the project:
  `gcloud projects add-iam-policy-binding <project> --member=serviceAccount:<email> --role=<role>`,
  where `--role` takes the complete path of a predefined role.
  <https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding>
  `roles/firebaserules.admin` is listed in the predefined-roles reference
  (<https://docs.cloud.google.com/iam/docs/roles-permissions/firebaserules>). No source read here
  confirms `roles/serviceusage.serviceUsageConsumer`, so check that ID against the Service Usage
  entry in the predefined-roles reference before scripting it.
- The key itself is `gcloud iam service-accounts keys create <output-file> --iam-account=<email>`
  (JSON by default). The reference states no limit and no exception for Firebase-managed accounts,
  and does not say the command works on one.
  <https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create>
- Nothing in the CLIs configures the Google provider or authorized domains. Those two console steps
  stay, and they are the only ones that need Authentication at all.

None of the CLI commands above is documented as requiring billing, but I did not find a source that
states Spark compatibility for each command. A script should be tried against a fresh Spark project
before it is trusted.

## Closing the web-app gap

`docs/household-setup.md` never registers a web app, yet step 7 needs that app's config snippet.
Under the recommended option this becomes a scripted step after Firestore:
`firebase apps:create WEB <name> --project <id>` then `firebase apps:sdkconfig WEB <app-id>`. In the
manual doc it is Project settings → General → Your apps → Add app (Web), then the SDK setup and
configuration snippet.

## Follow-up if the developer takes the recommendation

A ticket for the script itself (one seam: a provisioning script covering steps 1, 2, 5 and web-app
registration) and a separate doc ticket adding the web-app step to `docs/household-setup.md`.
