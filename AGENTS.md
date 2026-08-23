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
