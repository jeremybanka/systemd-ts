---
"systemd-ts": patch
---

Add JSDoc across the main public API and broaden executable-directive validation beyond just `ExecStart`.

For example, executable-valued directives such as `ExecCondition`, `ExecStartPre`, `ExecStop`, and `ExecReload` now follow the same absolute-runtime validation rules as `ExecStart`, and the public classes and helpers now document their behavior directly in editor tooltips.
