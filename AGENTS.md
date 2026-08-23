# Agent instructions

## Agent skills

### Issue tracker

Issues and pull requests live in GitHub; use the `gh` CLI for issue and pull-request operations. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repository. Read `CONTEXT.md` and relevant ADRs before exploring a domain area. See `docs/agents/domain.md`.

## Verification

- Run the repository pre-commit check (`npm run lint`) before every push.
- Run builds and tests in the repository's `.devcontainer`, not on the host, because native `node_modules` binaries may be platform-specific.
- From the devcontainer, install dependencies with `npm ci`, then run `npm run test:all` and the relevant build command before pushing code changes.

## Blocked tickets and stacked PRs

- Treat a ticket as blocked by its declared dependencies unless the user explicitly instructs us to continue.
- We may continue with an instructed blocked ticket when the blocker already has an open PR.
- In that case, branch from the blocker's PR branch and create a stacked PR whose base is the blocker's branch. Keep the dependent changes separate so the stacked PR can be retargeted after the blocker merges.
