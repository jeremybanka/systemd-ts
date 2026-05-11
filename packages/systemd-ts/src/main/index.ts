export {
  ExecutableInferenceError,
  InvalidExecDirectiveError,
  NoUnitsProvidedError,
  NotifySendError,
  SystemctlCommandError,
  SystemdTsError,
  UnitEnableError,
  UnitLogsReadError,
  UnitMaterializationError,
  UnitStartError,
} from "./errors.ts";
export { Executable, defineExecutable } from "./executable.ts";
export { notify } from "./notify.ts";
export { SystemdService } from "./systemd-service.ts";
export { SystemdTimer } from "./systemd-timer.ts";
export { Systemctl } from "./systemctl.ts";
export { Systemd, SystemdMaterialization, SystemdTs, defaultSystemd } from "./systemd.ts";
export type {
  SystemdTsAttachmentSelector,
  SystemdTsAttachOptions,
  SystemdTsAttachmentResult,
  SystemdTsDetachOptions,
  SystemdTsReattachOptions,
} from "./systemd.ts";
export type { Result } from "./internal.ts";
export type {
  AnySystemdService,
  AnySystemdTimer,
  CommandExecutionOptions,
  CommandExecutor,
  CommandOutput,
  ExecutableOptions,
  MaterializedUnit,
  LogsOptions,
  NotifyOptions,
  ServiceBaseName,
  ServiceFilename,
  StartStatus,
  SystemdOptions,
  SystemdServiceOptions,
  SystemctlActiveState,
  SystemctlEnablementState,
  SystemctlIsEnabledOptions,
  SystemctlIsSystemRunningOptions,
  SystemctlListTimersOptions,
  SystemctlOptions,
  SystemctlServiceStatus,
  SystemctlSystemRunningState,
  SystemctlStateQueryOptions,
  SystemctlShowOptions,
  SystemctlStatusOptions,
  SystemctlTimerListEntry,
  SystemdTimerOptions,
  SystemdUnit,
  TimerBaseName,
  TimerFilename,
  TimerTargetServiceName,
  TimerTargetUnit,
  UnitValue,
  ValidInstallUnits,
} from "./types.ts";
export type {
  NotifySendErrorReason,
  SystemctlCommandErrorReason,
  SystemdCommandEnvironmentReason,
  UnitLogsReadErrorReason,
  UnitMaterializationErrorReason,
} from "./errors.ts";

import * as I from "./internal.ts";
/**
 * Internal helpers are exposed for advanced use, but they are not a stable public API.
 * Expect breaking changes here outside the package's normal compatibility guarantees.
 */
export const Internal: typeof I = I;
