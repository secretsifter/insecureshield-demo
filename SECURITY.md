# Security policy

## This repository is intentionally insecure

`insecureshield-demo` exists to give secret-detection tools a controlled target to fire on. Every credential-shaped string in this repository is **synthetic test data**:

- Pattern-valid (so detection rules trigger)
- Non-functional (auth-tested against each provider's real API and confirmed to return `401 Unauthorized` / `400 Invalid` / `InvalidClientTokenId`)
- Structurally fake (e.g. embedded RSA "private key" stubs are too short to be real keys)

The Microsoft Azure AD tenant ID and client ID values are **synthetic UUIDs** with no relationship to any real Microsoft tenant or registered application.

## Reporting

**Please do not file CVEs against this repository.** The exposed credentials are intentional artifacts of the demo's purpose.

If you have a concern that nonetheless warrants a private channel, open a GitHub issue describing the concern at a high level and we will follow up. The categories worth flagging:

- A credential value here unexpectedly authenticates against a real service. (We've tested each one. If you find otherwise, this is a real concern and we want to know.)
- A reference to a real organization, product, or person that we missed during the synthetic-data review.
- A licensing or trademark concern with anything in the codebase.

For all other security-tooling questions or scanner-evaluation discussion, regular GitHub issues are the right channel.

## What this repository does *not* do

- Make any outbound network connections beyond the local Express server
- Persist any user input
- Communicate with any cloud provider (the cloud-shaped configuration values are decorative)
- Phone home, telemetry, or auto-update

It is a static asset with a thin HTTP server in front. Nothing here moves data anywhere.
