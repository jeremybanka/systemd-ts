---
"systemd-ts": patch
---

Simplified the remaining convenience typings around executable and resource-limit directives, and cleaned up the generated documentation vocabulary for spellcheck.

For example, `ExecStart` now uses the simpler `ExecDirective` command model while `ExecPaths` is typed as a path list instead of an executable command, and process resource limits now promote values like `"infinity"` and `soft:hard` in editor completions.
