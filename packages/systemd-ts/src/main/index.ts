export { Executable, defineExecutable } from "./executable.ts";
export { notify } from "./notify.ts";
export { SystemdService } from "./systemd-service.ts";
export { SystemdTimer } from "./systemd-timer.ts";
export { Systemd, SystemdInstallResult, defaultSystemd } from "./systemd.ts";
export type {
  AnySystemdService,
  AnySystemdTimer,
  CommandExecutor,
  CommandResult,
  ExecutableOptions,
  InstalledUnit,
  LogsOptions,
  NotifyOptions,
  ServiceBaseName,
  ServiceFilename,
  StartResult,
  SystemdOptions,
  SystemdServiceOptions,
  SystemdTimerOptions,
  SystemdUnit,
  TimerBaseName,
  TimerFilename,
  TimerTargetServiceName,
  TimerTargetUnit,
  UnitSection,
  UnitValue,
  ValidInstallUnits,
} from "./types.ts";

import * as I from "./internal.ts";
/**
 * Internal helpers are exposed for advanced use, but they are not a stable public API.
 * Expect breaking changes here outside the package's normal compatibility guarantees.
 */
export const Internal: typeof I = I;
