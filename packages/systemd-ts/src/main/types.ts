import type { Executable } from "./executable.ts";
import type { SystemdService } from "./systemd-service.ts";
import type { SystemdTimer } from "./systemd-timer.ts";

export type ScalarDirectiveValue = string | number | boolean;
export type ScalarDirectiveValues = ScalarDirectiveValue | readonly ScalarDirectiveValue[];
export type ExecutableDirectiveValue = string | Executable;
export type ExecutableDirectiveValues =
  | ExecutableDirectiveValue
  | readonly ExecutableDirectiveValue[];
export type UnitValue = ScalarDirectiveValue | Executable;
export type UnitValueList = readonly UnitValue[];
export type UnitSectionValue = UnitValue | UnitValueList | undefined;

export interface CustomDirectiveSection {
  readonly [key: `X-${string}`]: UnitSectionValue;
}

/**
 * Generic unit-level directives shared by service and timer units.
 *
 * Sources:
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.directives.html
 */
export interface SystemdUnitSection extends CustomDirectiveSection {
  readonly After?: ScalarDirectiveValues;
  readonly AllowIsolate?: ScalarDirectiveValues;
  readonly AssertACPower?: ScalarDirectiveValues;
  readonly AssertArchitecture?: ScalarDirectiveValues;
  readonly AssertCPUFeature?: ScalarDirectiveValues;
  readonly AssertCPUPressure?: ScalarDirectiveValues;
  readonly AssertCPUs?: ScalarDirectiveValues;
  readonly AssertCapability?: ScalarDirectiveValues;
  readonly AssertControlGroupController?: ScalarDirectiveValues;
  readonly AssertCredential?: ScalarDirectiveValues;
  readonly AssertDirectoryNotEmpty?: ScalarDirectiveValues;
  readonly AssertEnvironment?: ScalarDirectiveValues;
  readonly AssertFileIsExecutable?: ScalarDirectiveValues;
  readonly AssertFileNotEmpty?: ScalarDirectiveValues;
  readonly AssertFirstBoot?: ScalarDirectiveValues;
  readonly AssertGroup?: ScalarDirectiveValues;
  readonly AssertHost?: ScalarDirectiveValues;
  readonly AssertIOPressure?: ScalarDirectiveValues;
  readonly AssertKernelCommandLine?: ScalarDirectiveValues;
  readonly AssertKernelModuleLoaded?: ScalarDirectiveValues;
  readonly AssertKernelVersion?: ScalarDirectiveValues;
  readonly AssertMemory?: ScalarDirectiveValues;
  readonly AssertMemoryPressure?: ScalarDirectiveValues;
  readonly AssertNeedsUpdate?: ScalarDirectiveValues;
  readonly AssertOSRelease?: ScalarDirectiveValues;
  readonly AssertPathExists?: ScalarDirectiveValues;
  readonly AssertPathExistsGlob?: ScalarDirectiveValues;
  readonly AssertPathIsDirectory?: ScalarDirectiveValues;
  readonly AssertPathIsEncrypted?: ScalarDirectiveValues;
  readonly AssertPathIsMountPoint?: ScalarDirectiveValues;
  readonly AssertPathIsReadWrite?: ScalarDirectiveValues;
  readonly AssertPathIsSocket?: ScalarDirectiveValues;
  readonly AssertPathIsSymbolicLink?: ScalarDirectiveValues;
  readonly AssertSecurity?: ScalarDirectiveValues;
  readonly AssertUser?: ScalarDirectiveValues;
  readonly AssertVersion?: ScalarDirectiveValues;
  readonly AssertVirtualization?: ScalarDirectiveValues;
  readonly Before?: ScalarDirectiveValues;
  readonly BindsTo?: ScalarDirectiveValues;
  readonly CollectMode?: ScalarDirectiveValues;
  readonly ConditionACPower?: ScalarDirectiveValues;
  readonly ConditionArchitecture?: ScalarDirectiveValues;
  readonly ConditionCPUFeature?: ScalarDirectiveValues;
  readonly ConditionCPUPressure?: ScalarDirectiveValues;
  readonly ConditionCPUs?: ScalarDirectiveValues;
  readonly ConditionCapability?: ScalarDirectiveValues;
  readonly ConditionControlGroupController?: ScalarDirectiveValues;
  readonly ConditionCredential?: ScalarDirectiveValues;
  readonly ConditionDirectoryNotEmpty?: ScalarDirectiveValues;
  readonly ConditionEnvironment?: ScalarDirectiveValues;
  readonly ConditionFileIsExecutable?: ScalarDirectiveValues;
  readonly ConditionFileNotEmpty?: ScalarDirectiveValues;
  readonly ConditionFirmware?: ScalarDirectiveValues;
  readonly ConditionFirstBoot?: ScalarDirectiveValues;
  readonly ConditionGroup?: ScalarDirectiveValues;
  readonly ConditionHost?: ScalarDirectiveValues;
  readonly ConditionIOPressure?: ScalarDirectiveValues;
  readonly ConditionKernelCommandLine?: ScalarDirectiveValues;
  readonly ConditionKernelModuleLoaded?: ScalarDirectiveValues;
  readonly ConditionKernelVersion?: ScalarDirectiveValues;
  readonly ConditionMemory?: ScalarDirectiveValues;
  readonly ConditionMemoryPressure?: ScalarDirectiveValues;
  readonly ConditionNeedsUpdate?: ScalarDirectiveValues;
  readonly ConditionOSRelease?: ScalarDirectiveValues;
  readonly ConditionPathExists?: ScalarDirectiveValues;
  readonly ConditionPathExistsGlob?: ScalarDirectiveValues;
  readonly ConditionPathIsDirectory?: ScalarDirectiveValues;
  readonly ConditionPathIsEncrypted?: ScalarDirectiveValues;
  readonly ConditionPathIsMountPoint?: ScalarDirectiveValues;
  readonly ConditionPathIsReadWrite?: ScalarDirectiveValues;
  readonly ConditionPathIsSocket?: ScalarDirectiveValues;
  readonly ConditionPathIsSymbolicLink?: ScalarDirectiveValues;
  readonly ConditionSecurity?: ScalarDirectiveValues;
  readonly ConditionUser?: ScalarDirectiveValues;
  readonly ConditionVersion?: ScalarDirectiveValues;
  readonly ConditionVirtualization?: ScalarDirectiveValues;
  readonly Conflicts?: ScalarDirectiveValues;
  readonly DefaultDependencies?: ScalarDirectiveValues;
  readonly Description?: ScalarDirectiveValues;
  readonly Documentation?: ScalarDirectiveValues;
  readonly FailureAction?: ScalarDirectiveValues;
  readonly FailureActionExitStatus?: ScalarDirectiveValues;
  readonly IgnoreOnIsolate?: ScalarDirectiveValues;
  readonly JobRunningTimeoutSec?: ScalarDirectiveValues;
  readonly JobTimeoutAction?: ScalarDirectiveValues;
  readonly JobTimeoutRebootArgument?: ScalarDirectiveValues;
  readonly JobTimeoutSec?: ScalarDirectiveValues;
  readonly JoinsNamespaceOf?: ScalarDirectiveValues;
  readonly OnFailure?: ScalarDirectiveValues;
  readonly OnFailureJobMode?: ScalarDirectiveValues;
  readonly OnSuccess?: ScalarDirectiveValues;
  readonly OnSuccessJobMode?: ScalarDirectiveValues;
  readonly PartOf?: ScalarDirectiveValues;
  readonly PropagatesReloadTo?: ScalarDirectiveValues;
  readonly PropagatesStopTo?: ScalarDirectiveValues;
  readonly RebootArgument?: ScalarDirectiveValues;
  readonly RefuseManualStart?: ScalarDirectiveValues;
  readonly RefuseManualStop?: ScalarDirectiveValues;
  readonly ReloadPropagatedFrom?: ScalarDirectiveValues;
  readonly Requires?: ScalarDirectiveValues;
  readonly RequiresMountsFor?: ScalarDirectiveValues;
  readonly Requisite?: ScalarDirectiveValues;
  readonly SourcePath?: ScalarDirectiveValues;
  readonly StartLimitAction?: ScalarDirectiveValues;
  readonly StartLimitBurst?: ScalarDirectiveValues;
  readonly StartLimitIntervalSec?: ScalarDirectiveValues;
  readonly StopPropagatedFrom?: ScalarDirectiveValues;
  readonly StopWhenUnneeded?: ScalarDirectiveValues;
  readonly SuccessAction?: ScalarDirectiveValues;
  readonly SuccessActionExitStatus?: ScalarDirectiveValues;
  readonly SurviveFinalKillSignal?: ScalarDirectiveValues;
  readonly Upholds?: ScalarDirectiveValues;
  readonly Wants?: ScalarDirectiveValues;
  readonly WantsMountsFor?: ScalarDirectiveValues;
}

/**
 * Install-time directives interpreted by `systemctl enable` rather than the
 * service manager during normal unit execution.
 *
 * Sources:
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.directives.html
 */
export interface SystemdInstallSection extends CustomDirectiveSection {
  readonly Alias?: ScalarDirectiveValues;
  readonly Also?: ScalarDirectiveValues;
  readonly DefaultInstance?: ScalarDirectiveValues;
  readonly RequiredBy?: ScalarDirectiveValues;
  readonly UpheldBy?: ScalarDirectiveValues;
  readonly WantedBy?: ScalarDirectiveValues;
}

/**
 * Timer-specific directives for `[Timer]` sections.
 *
 * Sources:
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.directives.html
 */
export interface SystemdTimerSection extends CustomDirectiveSection {
  readonly AccuracySec?: ScalarDirectiveValues;
  readonly DeferReactivation?: ScalarDirectiveValues;
  readonly FixedRandomDelay?: ScalarDirectiveValues;
  readonly OnActiveSec?: ScalarDirectiveValues;
  readonly OnBootSec?: ScalarDirectiveValues;
  readonly OnCalendar?: ScalarDirectiveValues;
  readonly OnClockChange?: ScalarDirectiveValues;
  readonly OnStartupSec?: ScalarDirectiveValues;
  readonly OnTimezoneChange?: ScalarDirectiveValues;
  readonly OnUnitActiveSec?: ScalarDirectiveValues;
  readonly OnUnitInactiveSec?: ScalarDirectiveValues;
  readonly Persistent?: ScalarDirectiveValues;
  readonly RandomizedDelaySec?: ScalarDirectiveValues;
  readonly RandomizedOffsetSec?: ScalarDirectiveValues;
  readonly RemainAfterElapse?: ScalarDirectiveValues;
  readonly Unit?: ScalarDirectiveValues;
  readonly WakeSystem?: ScalarDirectiveValues;
}

/**
 * Service-specific and shared execution directives for `[Service]` sections.
 *
 * This interface includes:
 * - directives from `systemd.service(5)`
 * - execution-environment directives from `systemd.exec(5)`
 * - kill-behaviour directives from `systemd.kill(5)`
 * - resource-control directives from `systemd.resource-control(5)`
 *
 * Sources:
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.kill.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.directives.html
 */
export interface SystemdServiceSection extends CustomDirectiveSection {
  readonly AllowedCPUs?: ScalarDirectiveValues;
  readonly AllowedMemoryNodes?: ScalarDirectiveValues;
  readonly AmbientCapabilities?: ScalarDirectiveValues;
  readonly AppArmorProfile?: ScalarDirectiveValues;
  readonly BPFDelegateAttachments?: ScalarDirectiveValues;
  readonly BPFDelegateCommands?: ScalarDirectiveValues;
  readonly BPFDelegateMaps?: ScalarDirectiveValues;
  readonly BPFDelegatePrograms?: ScalarDirectiveValues;
  readonly BPFProgram?: ScalarDirectiveValues;
  readonly BindLogSockets?: ScalarDirectiveValues;
  readonly BindNetworkInterface?: ScalarDirectiveValues;
  readonly BindPaths?: ScalarDirectiveValues;
  readonly BindReadOnlyPaths?: ScalarDirectiveValues;
  readonly BusName?: ScalarDirectiveValues;
  readonly CPUAffinity?: ScalarDirectiveValues;
  readonly CPUQuota?: ScalarDirectiveValues;
  readonly CPUQuotaPeriodSec?: ScalarDirectiveValues;
  readonly CPUSchedulingPolicy?: ScalarDirectiveValues;
  readonly CPUSchedulingPriority?: ScalarDirectiveValues;
  readonly CPUSchedulingResetOnFork?: ScalarDirectiveValues;
  readonly CPUWeight?: ScalarDirectiveValues;
  readonly CacheDirectory?: ScalarDirectiveValues;
  readonly CacheDirectoryAccounting?: ScalarDirectiveValues;
  readonly CacheDirectoryMode?: ScalarDirectiveValues;
  readonly CacheDirectoryQuota?: ScalarDirectiveValues;
  readonly CapabilityBoundingSet?: ScalarDirectiveValues;
  readonly ConfigurationDirectory?: ScalarDirectiveValues;
  readonly ConfigurationDirectoryMode?: ScalarDirectiveValues;
  readonly CoredumpFilter?: ScalarDirectiveValues;
  readonly CoredumpReceive?: ScalarDirectiveValues;
  readonly Delegate?: ScalarDirectiveValues;
  readonly DelegateNamespaces?: ScalarDirectiveValues;
  readonly DelegateSubgroup?: ScalarDirectiveValues;
  readonly DeviceAllow?: ScalarDirectiveValues;
  readonly DevicePolicy?: ScalarDirectiveValues;
  readonly DisableControllers?: ScalarDirectiveValues;
  readonly DynamicUser?: ScalarDirectiveValues;
  readonly Environment?: ScalarDirectiveValues;
  readonly EnvironmentFile?: ScalarDirectiveValues;
  readonly ExecCondition?: ExecutableDirectiveValues;
  readonly ExecPaths?: ScalarDirectiveValues;
  readonly ExecReload?: ExecutableDirectiveValues;
  readonly ExecReloadPost?: ExecutableDirectiveValues;
  readonly ExecSearchPath?: ScalarDirectiveValues;
  readonly ExecStart?: ExecutableDirectiveValues;
  readonly ExecStartPost?: ExecutableDirectiveValues;
  readonly ExecStartPre?: ExecutableDirectiveValues;
  readonly ExecStop?: ExecutableDirectiveValues;
  readonly ExecStopPost?: ExecutableDirectiveValues;
  readonly ExitType?: ScalarDirectiveValues;
  readonly ExtensionDirectories?: ScalarDirectiveValues;
  readonly ExtensionImagePolicy?: ScalarDirectiveValues;
  readonly ExtensionImages?: ScalarDirectiveValues;
  readonly FileDescriptorStoreMax?: ScalarDirectiveValues;
  readonly FileDescriptorStorePreserve?: ScalarDirectiveValues;
  readonly FinalKillSignal?: ScalarDirectiveValues;
  readonly Group?: ScalarDirectiveValues;
  readonly GuessMainPID?: ScalarDirectiveValues;
  readonly IOAccounting?: ScalarDirectiveValues;
  readonly IODeviceLatencyTargetSec?: ScalarDirectiveValues;
  readonly IODeviceWeight?: ScalarDirectiveValues;
  readonly IOReadBandwidthMax?: ScalarDirectiveValues;
  readonly IOReadIOPSMax?: ScalarDirectiveValues;
  readonly IOSchedulingClass?: ScalarDirectiveValues;
  readonly IOSchedulingPriority?: ScalarDirectiveValues;
  readonly IOWeight?: ScalarDirectiveValues;
  readonly IOWriteBandwidthMax?: ScalarDirectiveValues;
  readonly IOWriteIOPSMax?: ScalarDirectiveValues;
  readonly IPAccounting?: ScalarDirectiveValues;
  readonly IPAddressAllow?: ScalarDirectiveValues;
  readonly IPAddressDeny?: ScalarDirectiveValues;
  readonly IPEgressFilterPath?: ScalarDirectiveValues;
  readonly IPIngressFilterPath?: ScalarDirectiveValues;
  readonly IPCNamespacePath?: ScalarDirectiveValues;
  readonly IgnoreSIGPIPE?: ScalarDirectiveValues;
  readonly ImportCredential?: ScalarDirectiveValues;
  readonly InaccessiblePaths?: ScalarDirectiveValues;
  readonly KeyringMode?: ScalarDirectiveValues;
  readonly KillMode?: ScalarDirectiveValues;
  readonly KillSignal?: ScalarDirectiveValues;
  readonly LimitAS?: ScalarDirectiveValues;
  readonly LimitCORE?: ScalarDirectiveValues;
  readonly LimitCPU?: ScalarDirectiveValues;
  readonly LimitDATA?: ScalarDirectiveValues;
  readonly LimitFSIZE?: ScalarDirectiveValues;
  readonly LimitLOCKS?: ScalarDirectiveValues;
  readonly LimitMEMLOCK?: ScalarDirectiveValues;
  readonly LimitMSGQUEUE?: ScalarDirectiveValues;
  readonly LimitNICE?: ScalarDirectiveValues;
  readonly LimitNOFILE?: ScalarDirectiveValues;
  readonly LimitNPROC?: ScalarDirectiveValues;
  readonly LimitRSS?: ScalarDirectiveValues;
  readonly LimitRTPRIO?: ScalarDirectiveValues;
  readonly LimitRTTIME?: ScalarDirectiveValues;
  readonly LimitSIGPENDING?: ScalarDirectiveValues;
  readonly LimitSTACK?: ScalarDirectiveValues;
  readonly LoadCredential?: ScalarDirectiveValues;
  readonly LoadCredentialEncrypted?: ScalarDirectiveValues;
  readonly LockPersonality?: ScalarDirectiveValues;
  readonly LogExtraFields?: ScalarDirectiveValues;
  readonly LogFilterPatterns?: ScalarDirectiveValues;
  readonly LogLevelMax?: ScalarDirectiveValues;
  readonly LogNamespace?: ScalarDirectiveValues;
  readonly LogRateLimitBurst?: ScalarDirectiveValues;
  readonly LogRateLimitIntervalSec?: ScalarDirectiveValues;
  readonly LogsDirectory?: ScalarDirectiveValues;
  readonly LogsDirectoryAccounting?: ScalarDirectiveValues;
  readonly LogsDirectoryMode?: ScalarDirectiveValues;
  readonly LogsDirectoryQuota?: ScalarDirectiveValues;
  readonly ManagedOOMMemoryPressure?: ScalarDirectiveValues;
  readonly ManagedOOMMemoryPressureDurationSec?: ScalarDirectiveValues;
  readonly ManagedOOMMemoryPressureLimit?: ScalarDirectiveValues;
  readonly ManagedOOMPreference?: ScalarDirectiveValues;
  readonly ManagedOOMSwap?: ScalarDirectiveValues;
  readonly MemoryAccounting?: ScalarDirectiveValues;
  readonly MemoryDenyWriteExecute?: ScalarDirectiveValues;
  readonly MemoryHigh?: ScalarDirectiveValues;
  readonly MemoryKSM?: ScalarDirectiveValues;
  readonly MemoryLow?: ScalarDirectiveValues;
  readonly MemoryMax?: ScalarDirectiveValues;
  readonly MemoryMin?: ScalarDirectiveValues;
  readonly MemoryPressureThresholdSec?: ScalarDirectiveValues;
  readonly MemoryPressureWatch?: ScalarDirectiveValues;
  readonly MemorySwapMax?: ScalarDirectiveValues;
  readonly MemoryTHP?: ScalarDirectiveValues;
  readonly MemoryZSwapMax?: ScalarDirectiveValues;
  readonly MemoryZSwapWriteback?: ScalarDirectiveValues;
  readonly MountAPIVFS?: ScalarDirectiveValues;
  readonly MountFlags?: ScalarDirectiveValues;
  readonly MountImagePolicy?: ScalarDirectiveValues;
  readonly MountImages?: ScalarDirectiveValues;
  readonly NFTSet?: ScalarDirectiveValues;
  readonly NUMAMask?: ScalarDirectiveValues;
  readonly NUMAPolicy?: ScalarDirectiveValues;
  readonly NetworkNamespacePath?: ScalarDirectiveValues;
  readonly Nice?: ScalarDirectiveValues;
  readonly NoExecPaths?: ScalarDirectiveValues;
  readonly NoNewPrivileges?: ScalarDirectiveValues;
  readonly NonBlocking?: ScalarDirectiveValues;
  readonly NotifyAccess?: ScalarDirectiveValues;
  readonly OOMPolicy?: ScalarDirectiveValues;
  readonly OOMScoreAdjust?: ScalarDirectiveValues;
  readonly OpenFile?: ScalarDirectiveValues;
  readonly PAMName?: ScalarDirectiveValues;
  readonly PIDFile?: ScalarDirectiveValues;
  readonly PassEnvironment?: ScalarDirectiveValues;
  readonly Personality?: ScalarDirectiveValues;
  readonly PrivateBPF?: ScalarDirectiveValues;
  readonly PrivateDevices?: ScalarDirectiveValues;
  readonly PrivateIPC?: ScalarDirectiveValues;
  readonly PrivateMounts?: ScalarDirectiveValues;
  readonly PrivateNetwork?: ScalarDirectiveValues;
  readonly PrivatePIDs?: ScalarDirectiveValues;
  readonly PrivateTmp?: ScalarDirectiveValues;
  readonly PrivateUsers?: ScalarDirectiveValues;
  readonly ProcSubset?: ScalarDirectiveValues;
  readonly ProtectClock?: ScalarDirectiveValues;
  readonly ProtectControlGroups?: ScalarDirectiveValues;
  readonly ProtectHome?: ScalarDirectiveValues;
  readonly ProtectHostname?: ScalarDirectiveValues;
  readonly ProtectKernelLogs?: ScalarDirectiveValues;
  readonly ProtectKernelModules?: ScalarDirectiveValues;
  readonly ProtectKernelTunables?: ScalarDirectiveValues;
  readonly ProtectProc?: ScalarDirectiveValues;
  readonly ProtectSystem?: ScalarDirectiveValues;
  readonly ReadOnlyPaths?: ScalarDirectiveValues;
  readonly ReadWritePaths?: ScalarDirectiveValues;
  readonly RefreshOnReload?: ScalarDirectiveValues;
  readonly ReloadSignal?: ScalarDirectiveValues;
  readonly RemainAfterExit?: ScalarDirectiveValues;
  readonly RemoveIPC?: ScalarDirectiveValues;
  readonly Restart?: ScalarDirectiveValues;
  readonly RestartForceExitStatus?: ScalarDirectiveValues;
  readonly RestartKillSignal?: ScalarDirectiveValues;
  readonly RestartMaxDelaySec?: ScalarDirectiveValues;
  readonly RestartMode?: ScalarDirectiveValues;
  readonly RestartPreventExitStatus?: ScalarDirectiveValues;
  readonly RestartSec?: ScalarDirectiveValues;
  readonly RestartSteps?: ScalarDirectiveValues;
  readonly RestrictAddressFamilies?: ScalarDirectiveValues;
  readonly RestrictFileSystems?: ScalarDirectiveValues;
  readonly RestrictNamespaces?: ScalarDirectiveValues;
  readonly RestrictNetworkInterfaces?: ScalarDirectiveValues;
  readonly RestrictRealtime?: ScalarDirectiveValues;
  readonly RestrictSUIDSGID?: ScalarDirectiveValues;
  readonly RootDirectory?: ScalarDirectiveValues;
  readonly RootDirectoryStartOnly?: ScalarDirectiveValues;
  readonly RootEphemeral?: ScalarDirectiveValues;
  readonly RootHash?: ScalarDirectiveValues;
  readonly RootHashSignature?: ScalarDirectiveValues;
  readonly RootImage?: ScalarDirectiveValues;
  readonly RootImageOptions?: ScalarDirectiveValues;
  readonly RootImagePolicy?: ScalarDirectiveValues;
  readonly RootMStack?: ScalarDirectiveValues;
  readonly RootVerity?: ScalarDirectiveValues;
  readonly RuntimeDirectory?: ScalarDirectiveValues;
  readonly RuntimeDirectoryMode?: ScalarDirectiveValues;
  readonly RuntimeDirectoryPreserve?: ScalarDirectiveValues;
  readonly RuntimeMaxSec?: ScalarDirectiveValues;
  readonly RuntimeRandomizedExtraSec?: ScalarDirectiveValues;
  readonly SELinuxContext?: ScalarDirectiveValues;
  readonly SecureBits?: ScalarDirectiveValues;
  readonly SendSIGHUP?: ScalarDirectiveValues;
  readonly SendSIGKILL?: ScalarDirectiveValues;
  readonly SetCredential?: ScalarDirectiveValues;
  readonly SetCredentialEncrypted?: ScalarDirectiveValues;
  readonly SetLoginEnvironment?: ScalarDirectiveValues;
  readonly Slice?: ScalarDirectiveValues;
  readonly SmackProcessLabel?: ScalarDirectiveValues;
  readonly SocketBindAllow?: ScalarDirectiveValues;
  readonly SocketBindDeny?: ScalarDirectiveValues;
  readonly Sockets?: ScalarDirectiveValues;
  readonly StandardError?: ScalarDirectiveValues;
  readonly StandardInput?: ScalarDirectiveValues;
  readonly StandardInputData?: ScalarDirectiveValues;
  readonly StandardInputText?: ScalarDirectiveValues;
  readonly StandardOutput?: ScalarDirectiveValues;
  readonly StartupAllowedCPUs?: ScalarDirectiveValues;
  readonly StartupAllowedMemoryNodes?: ScalarDirectiveValues;
  readonly StartupCPUWeight?: ScalarDirectiveValues;
  readonly StartupIOWeight?: ScalarDirectiveValues;
  readonly StartupMemoryHigh?: ScalarDirectiveValues;
  readonly StartupMemoryLow?: ScalarDirectiveValues;
  readonly StartupMemoryMax?: ScalarDirectiveValues;
  readonly StartupMemorySwapMax?: ScalarDirectiveValues;
  readonly StartupMemoryZSwapMax?: ScalarDirectiveValues;
  readonly StateDirectory?: ScalarDirectiveValues;
  readonly StateDirectoryAccounting?: ScalarDirectiveValues;
  readonly StateDirectoryMode?: ScalarDirectiveValues;
  readonly StateDirectoryQuota?: ScalarDirectiveValues;
  readonly SuccessExitStatus?: ScalarDirectiveValues;
  readonly SupplementaryGroups?: ScalarDirectiveValues;
  readonly SyslogFacility?: ScalarDirectiveValues;
  readonly SyslogIdentifier?: ScalarDirectiveValues;
  readonly SyslogLevel?: ScalarDirectiveValues;
  readonly SyslogLevelPrefix?: ScalarDirectiveValues;
  readonly SystemCallArchitectures?: ScalarDirectiveValues;
  readonly SystemCallErrorNumber?: ScalarDirectiveValues;
  readonly SystemCallFilter?: ScalarDirectiveValues;
  readonly SystemCallLog?: ScalarDirectiveValues;
  readonly TTYColumns?: ScalarDirectiveValues;
  readonly TTYPath?: ScalarDirectiveValues;
  readonly TTYReset?: ScalarDirectiveValues;
  readonly TTYRows?: ScalarDirectiveValues;
  readonly TTYVHangup?: ScalarDirectiveValues;
  readonly TTYVTDisallocate?: ScalarDirectiveValues;
  readonly TasksAccounting?: ScalarDirectiveValues;
  readonly TasksMax?: ScalarDirectiveValues;
  readonly TemporaryFileSystem?: ScalarDirectiveValues;
  readonly TimeoutAbortSec?: ScalarDirectiveValues;
  readonly TimeoutSec?: ScalarDirectiveValues;
  readonly TimeoutCleanSec?: ScalarDirectiveValues;
  readonly TimeoutStartFailureMode?: ScalarDirectiveValues;
  readonly TimeoutStartSec?: ScalarDirectiveValues;
  readonly TimeoutStopFailureMode?: ScalarDirectiveValues;
  readonly TimeoutStopSec?: ScalarDirectiveValues;
  readonly TimerSlackNSec?: ScalarDirectiveValues;
  readonly UMask?: ScalarDirectiveValues;
  readonly USBFunctionDescriptors?: ScalarDirectiveValues;
  readonly USBFunctionStrings?: ScalarDirectiveValues;
  readonly UnsetEnvironment?: ScalarDirectiveValues;
  readonly User?: ScalarDirectiveValues;
  readonly UserNamespacePath?: ScalarDirectiveValues;
  readonly UtmpIdentifier?: ScalarDirectiveValues;
  readonly UtmpMode?: ScalarDirectiveValues;
  readonly Type?: ScalarDirectiveValues;
  readonly WatchdogSec?: ScalarDirectiveValues;
  readonly WatchdogSignal?: ScalarDirectiveValues;
  readonly WorkingDirectory?: ScalarDirectiveValues;
}

/**
 * @deprecated Use one of the specific section interfaces instead:
 * `SystemdUnitSection`, `SystemdInstallSection`, `SystemdServiceSection`, or
 * `SystemdTimerSection`.
 */
export interface UnitSection {
  readonly [key: string]: UnitSectionValue;
}

export interface SystemdServiceOptions {
  readonly install?: SystemdInstallSection;
  readonly name: string;
  readonly service: SystemdServiceSection;
  readonly unit?: SystemdUnitSection;
}

export interface SystemdTimerOptions {
  readonly install?: SystemdInstallSection;
  readonly name: string;
  readonly timer: SystemdTimerSection;
  readonly unit?: SystemdUnitSection;
}

type NoExtraKeys<TActual, TShape> = TActual & {
  readonly [K in Exclude<keyof TActual, keyof TShape>]: never;
};

type ExactOptionalSection<TSection, TShape> = TSection extends undefined
  ? undefined
  : NoExtraKeys<TSection, TShape>;

export type ExactSystemdServiceOptions<TOptions extends SystemdServiceOptions> = NoExtraKeys<
  Omit<TOptions, "install" | "service" | "unit"> & {
    readonly install?: ExactOptionalSection<TOptions[`install`], SystemdInstallSection>;
    readonly service: NoExtraKeys<TOptions[`service`], SystemdServiceSection>;
    readonly unit?: ExactOptionalSection<TOptions[`unit`], SystemdUnitSection>;
  },
  SystemdServiceOptions
>;

export type ExactSystemdTimerOptions<TOptions extends SystemdTimerOptions> = NoExtraKeys<
  Omit<TOptions, "install" | "timer" | "unit"> & {
    readonly install?: ExactOptionalSection<TOptions[`install`], SystemdInstallSection>;
    readonly timer: NoExtraKeys<TOptions[`timer`], SystemdTimerSection>;
    readonly unit?: ExactOptionalSection<TOptions[`unit`], SystemdUnitSection>;
  },
  SystemdTimerOptions
>;

export interface SystemdOptions {
  readonly executor?: CommandExecutor;
  readonly linkUnits?: boolean;
  readonly scope?: `system` | `user`;
  readonly unitDir?: string;
}

export interface CommandResult {
  readonly stderr: string;
  readonly stdout: string;
}

export type CommandExecutor = (command: string, args: readonly string[]) => Promise<CommandResult>;

export interface LogsOptions {
  readonly lines?: number;
}

export interface NotifyOptions {
  readonly executor?: CommandExecutor;
  readonly pid?: number;
  readonly socketPath?: string;
  readonly status?: string;
}

export interface StartResult {
  readonly activeState: string;
  readonly execMainStatus: number | undefined;
  readonly result: string;
  readonly subState: string;
  readonly unit: string;
}

export interface ExecutableOptions {
  readonly args?: readonly string[];
  readonly modulePath?: string;
  readonly runtimeEntrypoint?: string;
}

export type StripUnitSuffix<
  Value extends string,
  Suffix extends string,
> = Value extends `${infer Base}${Suffix}` ? Base : Value;

export type ServiceBaseName<Value extends string> = StripUnitSuffix<Value, `.service`>;
export type TimerBaseName<Value extends string> = StripUnitSuffix<Value, `.timer`>;
export type ServiceFilename<Value extends string> = `${ServiceBaseName<Value>}.service`;
export type TimerFilename<Value extends string> = `${TimerBaseName<Value>}.timer`;

export type TimerTargetUnit<TOptions extends SystemdTimerOptions> = TOptions[`timer`] extends {
  readonly Unit: infer UnitName extends string;
}
  ? UnitName
  : ServiceFilename<TOptions[`name`]>;

export type TimerTargetServiceName<TOptions extends SystemdTimerOptions> =
  TimerTargetUnit<TOptions> extends `${infer Base}.service` ? Base : never;

type IsWideString<Value extends string> = string extends Value ? true : false;

export type AnySystemdService = SystemdService<SystemdServiceOptions>;
export type AnySystemdTimer = SystemdTimer<SystemdTimerOptions>;
export type SystemdUnit = AnySystemdService | AnySystemdTimer;

export interface InstalledUnit<TUnit extends SystemdUnit = SystemdUnit> {
  readonly path: string;
  readonly unit: TUnit;
}

type ServiceNamesIn<TUnits extends readonly SystemdUnit[]> = TUnits[number] extends infer TUnit
  ? TUnit extends AnySystemdService
    ? TUnit[`name`]
    : never
  : never;

type TimerMatchesAnyService<TTimer extends AnySystemdTimer, TServiceNames extends string> =
  IsWideString<TimerTargetServiceName<TTimer[`options`]>> extends true
    ? true
    : IsWideString<TServiceNames> extends true
      ? true
      : [Extract<TServiceNames, TimerTargetServiceName<TTimer[`options`]>>] extends [never]
        ? false
        : true;

type MismatchedTimers<TUnits extends readonly SystemdUnit[]> = TUnits[number] extends infer TUnit
  ? TUnit extends AnySystemdTimer
    ? TimerMatchesAnyService<TUnit, ServiceNamesIn<TUnits>> extends true
      ? never
      : TUnit
    : never
  : never;

type HasServices<TUnits extends readonly SystemdUnit[]> = [ServiceNamesIn<TUnits>] extends [never]
  ? false
  : true;

type HasMismatchedServiceTimerPairs<TUnits extends readonly SystemdUnit[]> =
  HasServices<TUnits> extends true
    ? [MismatchedTimers<TUnits>] extends [never]
      ? false
      : true
    : false;

export type ValidInstallUnits<TUnits extends readonly SystemdUnit[]> =
  HasMismatchedServiceTimerPairs<TUnits> extends true ? never : TUnits;
