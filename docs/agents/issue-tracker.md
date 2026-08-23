# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside this clone.

## Existing label vocabulary

Preserve the repository's existing labels rather than creating a second vocabulary. Current labels include:

- `ready-for-agent` for implementation-ready work
- `enhancement` for feature work
- `wayfinder:map`, `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, and `wayfinder:task` for Wayfinder work

## Pull requests as a triage surface

**PRs as a request surface: no.** External pull requests are not treated as feature requests by the triage workflow.

## Wayfinding operations

Wayfinder uses GitHub issues for maps and child tickets. Use the repository's existing `wayfinder:*` labels and GitHub's native issue dependencies where available.
