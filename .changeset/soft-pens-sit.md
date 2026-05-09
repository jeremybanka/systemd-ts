---
"systemd-ts": patch
---

Fix `Exec*` absolute-path validation so documented systemd exec prefixes are accepted before the executable path check.

For example, rendering a service with `ExecStart: "-@/usr/bin/env custom-argv0 node /srv/app/start.mjs"` now succeeds instead of throwing an absolute-path validation error just because the command starts with `-@` instead of `/`.
