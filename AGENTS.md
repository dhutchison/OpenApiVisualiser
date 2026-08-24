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

## Feature integration branches

- For a feature developed across multiple tickets, create one feature-level integration branch from `master` before opening the ticket PRs. Use a `feat/<feature-name>` name, such as `feat/improve-complexity-scoring`.
- The first ticket PR targets the feature integration branch, not `master`. Later ticket PRs may remain stacked on the preceding ticket branches so each PR stays focused, but the stack must ultimately merge into the feature integration branch.
- Do not merge any ticket PR directly into `master` while the feature is in progress. When the complete feature is ready, open one final PR from the feature integration branch to `master`; that is the point at which the feature should reach `master` and trigger the normal deployment flow.
- When applying this workflow to an existing stack, create the integration branch from `master`, retarget the root PR to it, and preserve the existing dependent PR bases unless a later retarget is needed as the stack is merged.

## Native GitHub stacked PR metadata

- GitHub's public-preview stacked PR feature stores explicit stack metadata in addition to the ordinary PR base branches. Prefer the official `gh stack` extension for creating, syncing, rebasing, and submitting stacks; do not assume matching branch bases alone means the stack is correctly linked.
- A stack's bottom PR must be open and target the stack trunk. For this workflow the trunk is the feature integration branch. Each subsequent PR must target the head branch of the PR immediately below it, and all PRs must be listed in bottom-to-top order when creating or recreating the stack.
- Verify the live stack with `gh api repos/OWNER/REPO/stacks` or by filtering with `?pull_request=<number>`. Confirm the stack trunk, ordered PR membership, and open state before reporting the stack as repaired.
- If the bottom PR is replaced, retargeted, or accidentally closed, do not rely on closing and reopening PRs or editing one base ref in isolation. Inspect the stale stack, dissolve it with the Stacks API when necessary, and recreate it with the replacement PR numbers in bottom-to-top order. This prevents a closed historical bottom PR or `master` from remaining as the stack trunk.
- Keep the native stack trunk separate from `master`: merge the ticket stack into the feature integration branch, then use a final feature-integration-to-`master` PR when the complete feature is ready.
