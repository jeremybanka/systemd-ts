---
"systemd-ts": minor
---

Export public test utilities at `systemd-ts/test` and back them with a real Linux `systemd --user` integration harness.

For example, consumers can reuse the same test-host helpers the package uses internally:

```ts
import { ensureTestHost, createTestSandbox } from "systemd-ts/test";

await ensureTestHost();
await createTestSandbox("my integration test");
```

The package test suite now proves install, enable, oneshot start, timer-driven activation, log access, and notify/watchdog signaling against a real user manager.
