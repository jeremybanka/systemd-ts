---
"systemd-ts": minor
---

Confirm compatibility with systemd v262.2 after reviewing the cached v262.1 and v262.2 manpages and upstream fixes. No directive syntax or type changes are required. Clarify cumulative restart backoff, repeated maximum delays, restart-counter resets, and how `StartLimitBurst=` and `StartLimitIntervalSec=` stop automatic restarts.
