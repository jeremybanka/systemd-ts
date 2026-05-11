---
"systemd-ts": minor
---

Added a new `systemd.ts` application-owned upkeep layer for reconciling managed unit sets from TypeScript.

```ts
const systemd = new Systemd({
  scope: `user`,
  unitDir: join(homedir(), `.config/systemd/user`),
  linkUnits: true,
});

const result = await systemd.ts.reattach([service, timer], {
  owner: `com.example.backup-db`,
  enable: true,
  start: true,
  prune: true,
});
```

This new namespace introduces manifest-backed `attach()`, `detach()`, and `reattach()` workflows intended for desktop apps, self-updating agents, and other code-managed service setups. The package README now leads with this higher-level upkeep model, while the lower-level `Systemd` materialization and lifecycle flow remains documented in a dedicated subsection for direct `systemd` usage.
