---
"systemd-ts": major
---

Remove the deprecated `UnitSection` export as a breaking change. For example, code that previously typed a section as `UnitSection` should now use the specific interface that matches the file section, such as `SystemdUnitSection`, `SystemdInstallSection`, `SystemdServiceSection`, or `SystemdTimerSection`.
