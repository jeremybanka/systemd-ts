# Codex Instructions

- Use gitmoji for commit messages.
- Example: `✨ add initial systemd-ts package`
- Treat `mise` as the core toolchain manager for this repo.
- If a tool does not come from npm, install and manage it with `mise`.
- Use the `.manpages/` directory as the source of truth when adding or documenting features.
- `.manpages/` is organized by version to reduce ambiguity and make it easier to extend with new material.
- Pin dependencies as exactly as practical. Avoid loose ranges like `^`, `~`, or `latest` unless there is a documented reason.
- Assume `gh` is available when debugging GitHub Actions workflows and reading PR comments.
- Never directly modify `CHANGELOG.md`; describe release-facing changes in changesets instead.
- When writing changesets, if you want to do bullet points, don't. Make each bullet its own changeset instead.
- When a changeset says something was fixed or added, illustrate it with an example when possible.
