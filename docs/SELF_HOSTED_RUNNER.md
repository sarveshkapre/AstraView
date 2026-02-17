# Self-Hosted GitHub Actions Runner

This repository runs CI on a **self-hosted runner** (no GitHub-hosted minutes required).

## 1. Runner Prerequisites

Install these on the machine that will run CI:

- `git` (required by `actions/checkout`)
- `bash`
- `curl`
- `tar` and `gzip` (required by `actions/setup-node`)
- `node` and `npm` are provisioned by `actions/setup-node`, but system `node` is still useful for diagnostics
- network egress to `github.com`, `api.github.com`, `objects.githubusercontent.com`, `registry.npmjs.org`

Recommended platform baselines:

- Linux: Ubuntu 22.04+ with `build-essential`
- macOS: 13+ with Xcode Command Line Tools (`xcode-select --install`)

Optional tooling:

- Docker (not required by the current CI workflow, but useful if future jobs add container-based steps)

## 2. Register Runner in This Repository

1. Open the repo in GitHub: `Settings` -> `Actions` -> `Runners`.
2. Click `New self-hosted runner`.
3. Select your OS/architecture.
4. Run the provided commands on your machine (download + configure + start).
5. Keep the runner online.

Notes:

- The workflow uses `runs-on: self-hosted`, so a default self-hosted label is sufficient.
- If you run as a service, prefer non-root execution and a dedicated runner user.

## 3. Verify Runner Connectivity

After start-up, confirm the runner appears as `Idle` in:

- `Settings` -> `Actions` -> `Runners`

Then trigger CI manually:

1. Open `Actions` -> `CI`.
2. Click `Run workflow`.
3. Confirm job is picked up by your self-hosted runner.

## 4. Local End-to-End CI Check

Run this locally on the runner host to mirror the workflow steps:

```bash
./scripts/ci_self_hosted_smoke.sh
```

It executes:

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run build`
