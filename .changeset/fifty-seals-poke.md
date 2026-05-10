---
"systemd-ts": patch
---

Reformed the directive typings and JSDoc in `types.ts` so the built-in systemd directives are modeled more precisely and documented from cached systemd v260.1 manpages.

For example, timer booleans such as `Persistent` and `WakeSystem` are now plain booleans instead of broad scalar unions, and repeatable directives such as `OnCalendar` are represented as repeated directive lines rather than generic scalar arrays.
