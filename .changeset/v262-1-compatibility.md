---
"systemd-ts": minor
---

Confirm compatibility with systemd v262.1 after reviewing the cached v262 and v262.1 manpages. No directive syntax or type changes are required. Clarify that `+`-prefixed commands inherit the service manager's resource limits instead of `Limit*=` settings or their configured defaults, and that `RestrictRealtime=true` blocks all `sched_setattr()` calls, including non-realtime uses.
