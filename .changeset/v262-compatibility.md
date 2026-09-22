---
"systemd-ts": major
---

Add systemd v262 compatibility with `RestartRandomizedDelaySec=` and `LUOSession=`
service directives. The major release follows the package's upstream systemd
version alignment.

```ts
import { SystemdService } from "systemd-ts";

const service = new SystemdService({
  name: `worker`,
  service: {
    ExecStart: `/usr/bin/worker`,
    Restart: `on-failure`,
    RestartSec: `1s`,
    // New in systemd v262:
    RestartRandomizedDelaySec: `5s`,
    LUOSession: [`state`, `cache`],
    FileDescriptorStorePreserve: true,
  },
});
```

Refresh documentation for NUMA policies, secure bits, CPU feature conditions,
machine tags, and path-existence conditions. On systemd v262, `Type=notify-reload`
services must catch or block their configured reload signal before sending
`READY=1`, or startup fails. Start-limit intervals now include time spent suspended.
