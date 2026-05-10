import type { Executable } from "./executable.ts";
import type { SystemdService } from "./systemd-service.ts";
import type { SystemdTimer } from "./systemd-timer.ts";

export type UnitActionDirectiveValue =
  | "none"
  | "reboot"
  | "reboot-force"
  | "reboot-immediate"
  | "poweroff"
  | "poweroff-force"
  | "poweroff-immediate"
  | "exit"
  | "exit-force"
  | "soft-reboot"
  | "soft-reboot-force"
  | "kexec"
  | "kexec-force"
  | "halt"
  | "halt-force"
  | "halt-immediate";
export type JobModeDirectiveValue =
  | "fail"
  | "replace"
  | "replace-irreversibly"
  | "isolate"
  | "flush"
  | "ignore-dependencies"
  | "ignore-requirements";
export type ServiceTypeDirectiveValue =
  | "simple"
  | "exec"
  | "forking"
  | "oneshot"
  | "dbus"
  | "notify"
  | "notify-reload"
  | "idle";
export type ServiceExitTypeDirectiveValue = "main" | "cgroup";
export type ServiceRestartDirectiveValue =
  | "no"
  | "on-success"
  | "on-failure"
  | "on-abnormal"
  | "on-watchdog"
  | "on-abort"
  | "always";
export type ServiceRestartModeDirectiveValue = "normal" | "direct" | "debug";
export type NotifyAccessDirectiveValue = "none" | "main" | "exec" | "all";
export type OOMPolicyDirectiveValue = "continue" | "stop" | "kill";
export type FileDescriptorStorePreserveDirectiveValue = boolean | "restart";
export type TimeoutFailureModeDirectiveValue = "terminate" | "abort" | "kill";
export type KeyringModeDirectiveValue = "inherit" | "private" | "shared";
export type IOSchedulingClassDirectiveValue = "realtime" | "best-effort" | "idle";
export type MountPropagationDirectiveValue = "shared" | "slave" | "private";
export type DevicePolicyDirectiveValue = "auto" | "closed" | "strict";
export type CPUSchedulingPolicyDirectiveValue = "other" | "batch" | "idle" | "fifo" | "rr" | "ext";
export type SyslogFacilityDirectiveValue =
  | "kern"
  | "user"
  | "mail"
  | "daemon"
  | "auth"
  | "syslog"
  | "lpr"
  | "news"
  | "uucp"
  | "cron"
  | "authpriv"
  | "ftp"
  | "local0"
  | "local1"
  | "local2"
  | "local3"
  | "local4"
  | "local5"
  | "local6"
  | "local7";
export type SyslogLevelDirectiveValue =
  | "emerg"
  | "alert"
  | "crit"
  | "err"
  | "warning"
  | "notice"
  | "info"
  | "debug";
export type MemoryTHPDirectiveValue = "inherit" | "disable" | "madvise" | "system";
export type ProcSubsetDirectiveValue = "all" | "pid";
export type ProtectProcDirectiveValue = "noaccess" | "invisible" | "ptraceable" | "default";
export type UtmpModeDirectiveValue = "init" | "login" | "user";
export type ProcessResourceLimitDirectiveValue =
  | number
  | "infinity"
  | `${string}:${string}`
  | (string & {});
export type ManagedOOMDirectiveValue = "auto" | "kill";
export type ManagedOOMPreferenceDirectiveValue = "none" | "avoid" | "omit";
export type StandardInputDirectiveValue =
  | "null"
  | "tty"
  | "tty-force"
  | "tty-fail"
  | "data"
  | "socket"
  | "fd"
  | `file:${string}`
  | `fd:${string}`;
export type StandardOutputDirectiveValue =
  | "inherit"
  | "null"
  | "tty"
  | "journal"
  | "kmsg"
  | "journal+console"
  | "kmsg+console"
  | "socket"
  | "fd"
  | `file:${string}`
  | `append:${string}`
  | `truncate:${string}`
  | `fd:${string}`;
export type StandardErrorDirectiveValue = StandardOutputDirectiveValue | "inherit";
export type ExecDirective = string | Executable | readonly (string | Executable)[];
export type UnitValue = string | number | boolean | Executable;
export type UnitValueList = readonly UnitValue[];
export type UnitSectionValue = UnitValue | UnitValueList | undefined;

export interface CustomDirectiveSection {
  readonly [key: `X-${string}`]: UnitSectionValue;
}

/**
 * Generic unit-level directives shared by service and timer units.
 *
 * References in this file are grounded in cached upstream systemd v260.1 manpages.
 *
 * Sources:
 * - systemd v260.1, `systemd.unit(5)`
 */
export interface SystemdUnitSection extends CustomDirectiveSection {
  /** Units that should be ordered before this unit starts. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly After?: string | readonly string[];
  /** If true, this unit may be used with the systemctl isolate command. Otherwise, this will be refused. It probably is a good idea to leave this disabled except for target units that shall be used similar to runlevels in SysV init systems, just as a precaution to avoid unusable system states. This option defaults to false. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AllowIsolate?: boolean;
  /** Assertion form of `ConditionACPower=`. Check whether the system has AC power, or is exclusively battery powered at the time of activation of the unit. If set to true, the condition will hold only if at least one AC connector of the system is connected to a power source, or if no AC connectors are known. Conversely, if set to false, the condition will hold only if there is at least one AC connector known and all AC connectors are disconnected from a power source. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertACPower?: boolean | readonly boolean[];
  /** Assertion form of `ConditionArchitecture=`. Check whether the system is running on a specific architecture. Takes one of x86, x86-64, ppc, ppc-le, ppc64, ppc64-le, ia64, parisc, parisc64, s390, s390x, sparc, sparc64, mips, mips-le, mips64, mips64-le, alpha, arm, arm-be, arm64, arm64-be, sh, sh64, m68k, tilegx, cris, arc, arc-be, or native. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertArchitecture?: string | readonly string[];
  /** Assertion form of `ConditionCPUFeature=`. Verify that a given CPU feature is available via the CPUID instruction. This condition only does something on i386 and x86-64 processors. On other processors it is assumed that the CPU does not support the given feature. It checks the leaves 1, 7, 0x80000001, and 0x80000007. Valid values are: fpu, vme, de, pse, tsc, msr, pae, mce, cx8, apic, sep, mtrr, pge, mca, cmov, pat, pse36, clflush, mmx, fxsr, sse, sse2, ht, pni, pclmul, monitor, ssse3, fma3, cx16, sse4_1, sse4_2, movbe, popcnt, aes, xsave, osxsave, avx, f16c, rdrand, bmi1, avx2, bmi2, rdseed, adx, sha_ni, syscall, rdtscp, lm, lahf_lm, abm, constant_tsc. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertCPUFeature?: string | readonly string[];
  /** Assertion form of `ConditionCPUPressure=`. Verify that the overall system (memory, CPU or IO) pressure is below or equal to a threshold. This setting takes a threshold value as argument. It can be specified as a simple percentage value, suffixed with %, in which case the pressure will be measured as an average over the last five minutes before the attempt to start the unit is performed. Alternatively, the average timespan can also be specified using / as a separator, for example: 10%/1min. The supported timespans match what the kernel provides, and are limited to 10sec, 1min and 5min. The full PSI will be checked first, and if not found some will be checked. For more details, see the documentation on PSI (Pressure Stall Information) . Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertCPUPressure?: string | readonly string[];
  /** Assertion form of `ConditionCPUs=`. Verify that the specified number of CPUs is available to the current system. Takes a number of CPUs as argument, optionally prefixed with a comparison operator <, <=, = (or ==), != (or <>), >=, >. Compares the number of CPUs in the CPU affinity mask configured of the service manager itself with the specified number, adhering to the specified comparison operator. On physical systems the number of CPUs in the affinity mask of the service manager usually matches the number of physical CPUs, but in special and virtual environments might differ. In particular, in containers the affinity mask usually matches the number of CPUs assigned to the container and not the physically available ones. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertCPUs?: string | readonly string[];
  /** Assertion form of `ConditionCapability=`. Check whether the given capability exists in the capability bounding set of the service manager (i.e. this does not check whether capability is actually available in the permitted or effective sets, see capabilities(7) for details). Pass a capability name such as CAP_MKNOD, possibly prefixed with an exclamation mark to negate the check. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertCapability?: string | readonly string[];
  /** Assertion form of `ConditionControlGroupController=`. Check whether given cgroup controllers (e.g. cpu) are available for use on the system or whether the legacy v1 cgroup or the modern v2 cgroup hierarchy is used. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertControlGroupController?: string | readonly string[];
  /** Assertion form of `ConditionCredential=`. May be used to check whether a credential by the specified name was passed into the service manager. See System and Service Credentials for details about credentials. If used in services for the system service manager this may be used to conditionalize services based on system credentials passed in. If used in services for the per-user service manager this may be used to conditionalize services based on credentials passed into the unit@.service service instance belonging to the user. The argument must be a valid credential name. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertCredential?: string | readonly string[];
  /** Assertion form of `ConditionDirectoryNotEmpty=`. Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a non-empty directory. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertDirectoryNotEmpty?: string | readonly string[];
  /** Assertion form of `ConditionEnvironment=`. May be used to check whether a specific environment variable is set (or if prefixed with the exclamation mark — unset) in the service manager's environment block. The argument may be a single word, to check if the variable with this name is defined in the environment block, or an assignment (name=value), to check if the variable with this exact value is defined. Note that the environment block of the service manager itself is checked, i.e. not any variables defined with Environment= or EnvironmentFile=, as described above. This is particularly useful when the service manager runs inside a containerized environment or as per-user service manager, in order to check for variables passed in by the enclosing container manager or PAM. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertEnvironment?: string | readonly string[];
  /** Assertion form of `ConditionFileIsExecutable=`. Similar to `ConditionPathExists=`, but verifies that a certain path exists, is a regular file, and marked executable. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertFileIsExecutable?: string | readonly string[];
  /** Assertion form of `ConditionFileNotEmpty=`. Similar to `ConditionPathExists=`, but verifies that a certain path exists and refers to a regular file with a non-zero size. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertFileNotEmpty?: string | readonly string[];
  /** Assertion form of `ConditionFirstBoot=`. This condition may be used to conditionalize units on whether the system is booting up for the first time. This roughly means that /etc/ was unpopulated when the system started booting (for details, see "First Boot Semantics" in machine-id(5)). First Boot is considered finished (this condition will evaluate as false) after the manager has finished the startup phase. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertFirstBoot?: boolean | readonly boolean[];
  /** Assertion form of `ConditionGroup=`. Similar to `ConditionUser=`, but verifies that the service manager's real or effective group, or any of its auxiliary groups, match the specified group or GID. This setting does not support the special value @system. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertGroup?: string | readonly string[];
  /** Assertion form of `ConditionHost=`. May be used to match against the hostname, machine ID, boot ID or product UUID of the host. This either takes a hostname string (optionally with shell style globs) which is tested against the locally set hostname as returned by gethostname2, or a 128bit ID or UUID, formatted as string. The latter is compared against machine ID, boot ID and the firmware product UUID if there is any. See machine-id(5) for details about the machine ID. The test may be negated by prepending an exclamation mark. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertHost?: string | readonly string[];
  /** Assertion form of `ConditionIOPressure=`. Verify that the overall system (memory, CPU or IO) pressure is below or equal to a threshold. This setting takes a threshold value as argument. It can be specified as a simple percentage value, suffixed with %, in which case the pressure will be measured as an average over the last five minutes before the attempt to start the unit is performed. Alternatively, the average timespan can also be specified using / as a separator, for example: 10%/1min. The supported timespans match what the kernel provides, and are limited to 10sec, 1min and 5min. The full PSI will be checked first, and if not found some will be checked. For more details, see the documentation on PSI (Pressure Stall Information) . Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertIOPressure?: string | readonly string[];
  /** Assertion form of `ConditionKernelCommandLine=`. May be used to check whether a specific kernel command line option is set (or if prefixed with the exclamation mark — unset). The argument must either be a single word, or an assignment (i.e. two words, separated by =). In the former case the kernel command line is searched for the word appearing as is, or as left hand side of an assignment. In the latter case, the exact assignment is looked for with right and left hand side matching. This operates on the kernel command line communicated to userspace via /proc/cmdline, except when the service manager is invoked as payload of a container manager, in which case the command line of PID 1 is used instead (i.e. /proc/1/cmdline). Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertKernelCommandLine?: string | readonly string[];
  /** Assertion form of `ConditionKernelModuleLoaded=`. Test whether the specified kernel module has been loaded and is already fully initialized. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertKernelModuleLoaded?: string | readonly string[];
  /** Assertion form of `ConditionKernelVersion=`. May be used to check whether the kernel version (as reported by uname -r) matches a certain expression, or if prefixed with the exclamation mark, does not match. The argument must be a list of (potentially quoted) expressions. Each expression starts with one of = or != for string comparisons, <, <=, ==, <>, >=, > for version comparisons, or $=, !$= for a shell-style glob match. If no operator is specified, $= is implied. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertKernelVersion?: string | readonly string[];
  /** Assertion form of `ConditionMemory=`. Verify that the specified amount of system memory is available to the current system. Takes a memory size in bytes as argument, optionally prefixed with a comparison operator <, <=, = (or ==), != (or <>), >=, >. On bare-metal systems compares the amount of physical memory in the system with the specified size, adhering to the specified comparison operator. In containers compares the amount of memory assigned to the container instead. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertMemory?: number | string | readonly (number | string)[];
  /** Assertion form of `ConditionMemoryPressure=`. Verify that the overall system (memory, CPU or IO) pressure is below or equal to a threshold. This setting takes a threshold value as argument. It can be specified as a simple percentage value, suffixed with %, in which case the pressure will be measured as an average over the last five minutes before the attempt to start the unit is performed. Alternatively, the average timespan can also be specified using / as a separator, for example: 10%/1min. The supported timespans match what the kernel provides, and are limited to 10sec, 1min and 5min. The full PSI will be checked first, and if not found some will be checked. For more details, see the documentation on PSI (Pressure Stall Information) . Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertMemoryPressure?: string | readonly string[];
  /** Assertion form of `ConditionNeedsUpdate=`. Takes one of /var/ or /etc/ as argument, possibly prefixed with a ! (to invert the condition). This condition may be used to conditionalize units on whether the specified directory requires an update because /usr/'s modification time is newer than the stamp file .updated in the specified directory. This is useful to implement offline updates of the vendor operating system resources in /usr/ that require updating of /etc/ or /var/ on the next following boot. Units making use of this condition should order themselves before systemd-update-done.service8, to make sure they run before the stamp file's modification time gets reset indicating a completed update. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertNeedsUpdate?: string | readonly string[];
  /** Assertion form of `ConditionOSRelease=`. Verify that a specific key=value pair is set in the host's os-release5. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertOSRelease?: string | readonly string[];
  /** Assertion form of `ConditionPathExists=`. Check for the existence of a file. If the specified absolute path name does not exist, the condition will fail. If the absolute path name passed to ConditionPathExists= is prefixed with an exclamation mark (!), the test is negated, and the unit is only started if the path does not exist. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathExists?: string | readonly string[];
  /** Assertion form of `ConditionPathExistsGlob=`. Similar to `ConditionPathExists=`, but checks for the existence of at least one file or directory matching the specified globbing pattern. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathExistsGlob?: string | readonly string[];
  /** Assertion form of `ConditionPathIsDirectory=`. Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a directory. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathIsDirectory?: string | readonly string[];
  /** Assertion form of `ConditionPathIsEncrypted=`. Similar to `ConditionPathExists=`, but verifies that the underlying file system's backing block device is encrypted using dm-crypt/LUKS. Note that this check does not cover ext4 per-directory encryption, and only detects block level encryption. Moreover, if the specified path resides on a file system on top of a loopback block device, only encryption above the loopback device is detected. It is not detected whether the file system backing the loopback block device is encrypted. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathIsEncrypted?: string | readonly string[];
  /** Assertion form of `ConditionPathIsMountPoint=`. Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a mount point. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathIsMountPoint?: string | readonly string[];
  /** Assertion form of `ConditionPathIsReadWrite=`. Similar to `ConditionPathExists=`, but verifies that the underlying file system is readable and writable (i.e. not mounted read-only). Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathIsReadWrite?: string | readonly string[];
  /** Assertion form of `ConditionPathIsSocket=`. Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a socket. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathIsSocket?: string | readonly string[];
  /** Assertion form of `ConditionPathIsSymbolicLink=`. Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a symbolic link. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertPathIsSymbolicLink?: string | readonly string[];
  /** Assertion form of `ConditionSecurity=`. May be used to check whether the given security technology is enabled on the system. Currently, the following values are recognized:. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertSecurity?: string | readonly string[];
  /** Assertion form of `ConditionUser=`. Takes a numeric UID, a UNIX user name, or the special value @system. This condition may be used to check whether the service manager is running as the given user. The special value @system can be used to check if the user id is within the system user range. This option is not useful for system services, as the system manager exclusively runs as the root user, and thus the test result is constant. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertUser?: string | readonly string[];
  /** Assertion form of `ConditionVersion=`. May be used to check whether a software version matches a certain expression, or if prefixed with the exclamation mark, does not match. The first argument is the software whose version has to be checked. Currently kernel, systemd and glibc are supported. If this argument is omitted, kernel is implied. The second argument must be a list of (potentially quoted) expressions. Each expression starts with one of = or != for string comparisons, <, <=, ==, <>, >=, > for version comparisons, or $=, !$= for a shell-style glob match. If no operator is specified, $= is implied. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertVersion?: string | readonly string[];
  /** Assertion form of `ConditionVirtualization=`. Check whether the system is executed in a virtualized environment and optionally test whether it is a specific implementation. Takes either boolean value to check if being executed in any virtualized environment, or one of vm and container to test against a generic type of virtualization solution, or one of qemu, kvm, amazon, zvm, vmware, microsoft, oracle, powervm, xen, bochs, uml, bhyve, qnx, apple, sre, openvz, lxc, lxc-libvirt, systemd-nspawn, docker, podman, rkt, wsl, proot, pouch, acrn to test against a specific implementation, or private-users to check whether we are running in a user namespace. See systemd-detect-virt1 for a full list of known virtualization technologies and their identifiers. If multiple virtualization technologies are nested, only the innermost is considered. The test may be negated by prepending an exclamation mark. Unlike conditions, a mismatch fails the start job instead of skipping it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly AssertVirtualization?: boolean | string | readonly (boolean | string)[];
  /** Units that should be ordered after this unit starts. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Before?: string | readonly string[];
  /** Configures requirement dependencies, very similar in style to Requires=. However, this dependency type is stronger: in addition to the effects of Requires=, which already stops (or restarts) the configuring unit when a listed unit is explicitly stopped (or restarted), it also does so when a listed unit stops unexpectedly (which includes when it fails). Units can suddenly, unexpectedly enter inactive state for different reasons: the main process of a service unit might terminate on its own choice, the backing device of a device unit might be unplugged or the mount point of a mount unit might be unmounted without involvement of the system and service manager. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly BindsTo?: string | readonly string[];
  /** Tweaks the "garbage collection" algorithm for this unit. Takes one of inactive or inactive-or-failed. If set to inactive the unit will be unloaded if it is in the inactive state and is not referenced by clients, jobs or other units — however it is not unloaded if it is in the failed state. In failed mode, failed units are not unloaded until the user invoked systemctl reset-failed on them to reset the failed state, or an equivalent command. This behaviour is altered if this option is set to inactive-or-failed: in this case, the unit is unloaded even if the unit is in a failed state, and thus an explicitly resetting of the failed state is not necessary. Note that if this mode is used unit results (such as exit codes, exit signals, consumed resources, …) are flushed out immediately after the unit completed, except for what is stored in the logging subsystem. Defaults to inactive. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly CollectMode?: "inactive" | "inactive-or-failed";
  /** Check whether the system has AC power, or is exclusively battery powered at the time of activation of the unit. If set to true, the condition will hold only if at least one AC connector of the system is connected to a power source, or if no AC connectors are known. Conversely, if set to false, the condition will hold only if there is at least one AC connector known and all AC connectors are disconnected from a power source. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionACPower?: boolean | readonly boolean[];
  /** Check whether the system is running on a specific architecture. Takes one of x86, x86-64, ppc, ppc-le, ppc64, ppc64-le, ia64, parisc, parisc64, s390, s390x, sparc, sparc64, mips, mips-le, mips64, mips64-le, alpha, arm, arm-be, arm64, arm64-be, sh, sh64, m68k, tilegx, cris, arc, arc-be, or native. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionArchitecture?: string | readonly string[];
  /** Verify that a given CPU feature is available via the CPUID instruction. This condition only does something on i386 and x86-64 processors. On other processors it is assumed that the CPU does not support the given feature. It checks the leaves 1, 7, 0x80000001, and 0x80000007. Valid values are: fpu, vme, de, pse, tsc, msr, pae, mce, cx8, apic, sep, mtrr, pge, mca, cmov, pat, pse36, clflush, mmx, fxsr, sse, sse2, ht, pni, pclmul, monitor, ssse3, fma3, cx16, sse4_1, sse4_2, movbe, popcnt, aes, xsave, osxsave, avx, f16c, rdrand, bmi1, avx2, bmi2, rdseed, adx, sha_ni, syscall, rdtscp, lm, lahf_lm, abm, constant_tsc. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionCPUFeature?: string | readonly string[];
  /** Verify that the overall system (memory, CPU or IO) pressure is below or equal to a threshold. This setting takes a threshold value as argument. It can be specified as a simple percentage value, suffixed with %, in which case the pressure will be measured as an average over the last five minutes before the attempt to start the unit is performed. Alternatively, the average timespan can also be specified using / as a separator, for example: 10%/1min. The supported timespans match what the kernel provides, and are limited to 10sec, 1min and 5min. The full PSI will be checked first, and if not found some will be checked. For more details, see the documentation on PSI (Pressure Stall Information) . Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionCPUPressure?: string | readonly string[];
  /** Verify that the specified number of CPUs is available to the current system. Takes a number of CPUs as argument, optionally prefixed with a comparison operator <, <=, = (or ==), != (or <>), >=, >. Compares the number of CPUs in the CPU affinity mask configured of the service manager itself with the specified number, adhering to the specified comparison operator. On physical systems the number of CPUs in the affinity mask of the service manager usually matches the number of physical CPUs, but in special and virtual environments might differ. In particular, in containers the affinity mask usually matches the number of CPUs assigned to the container and not the physically available ones. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionCPUs?: string | readonly string[];
  /** Check whether the given capability exists in the capability bounding set of the service manager (i.e. this does not check whether capability is actually available in the permitted or effective sets, see capabilities(7) for details). Pass a capability name such as CAP_MKNOD, possibly prefixed with an exclamation mark to negate the check. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionCapability?: string | readonly string[];
  /** Check whether given cgroup controllers (e.g. cpu) are available for use on the system or whether the legacy v1 cgroup or the modern v2 cgroup hierarchy is used. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionControlGroupController?: string | readonly string[];
  /** May be used to check whether a credential by the specified name was passed into the service manager. See System and Service Credentials for details about credentials. If used in services for the system service manager this may be used to conditionalize services based on system credentials passed in. If used in services for the per-user service manager this may be used to conditionalize services based on credentials passed into the unit@.service service instance belonging to the user. The argument must be a valid credential name. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionCredential?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a non-empty directory. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionDirectoryNotEmpty?: string | readonly string[];
  /** May be used to check whether a specific environment variable is set (or if prefixed with the exclamation mark — unset) in the service manager's environment block. The argument may be a single word, to check if the variable with this name is defined in the environment block, or an assignment (name=value), to check if the variable with this exact value is defined. Note that the environment block of the service manager itself is checked, i.e. not any variables defined with Environment= or EnvironmentFile=, as described above. This is particularly useful when the service manager runs inside a containerized environment or as per-user service manager, in order to check for variables passed in by the enclosing container manager or PAM. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionEnvironment?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that a certain path exists, is a regular file, and marked executable. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionFileIsExecutable?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that a certain path exists and refers to a regular file with a non-zero size. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionFileNotEmpty?: string | readonly string[];
  /** Check whether the system's firmware is of a certain type. The following values are possible:. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionFirmware?: string | readonly string[];
  /** This condition may be used to conditionalize units on whether the system is booting up for the first time. This roughly means that /etc/ was unpopulated when the system started booting (for details, see "First Boot Semantics" in machine-id(5)). First Boot is considered finished (this condition will evaluate as false) after the manager has finished the startup phase. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionFirstBoot?: boolean | readonly boolean[];
  /** Similar to `ConditionUser=`, but verifies that the service manager's real or effective group, or any of its auxiliary groups, match the specified group or GID. This setting does not support the special value @system. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionGroup?: string | readonly string[];
  /** May be used to match against the hostname, machine ID, boot ID or product UUID of the host. This either takes a hostname string (optionally with shell style globs) which is tested against the locally set hostname as returned by gethostname2, or a 128bit ID or UUID, formatted as string. The latter is compared against machine ID, boot ID and the firmware product UUID if there is any. See machine-id(5) for details about the machine ID. The test may be negated by prepending an exclamation mark. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionHost?: string | readonly string[];
  /** Verify that the overall system (memory, CPU or IO) pressure is below or equal to a threshold. This setting takes a threshold value as argument. It can be specified as a simple percentage value, suffixed with %, in which case the pressure will be measured as an average over the last five minutes before the attempt to start the unit is performed. Alternatively, the average timespan can also be specified using / as a separator, for example: 10%/1min. The supported timespans match what the kernel provides, and are limited to 10sec, 1min and 5min. The full PSI will be checked first, and if not found some will be checked. For more details, see the documentation on PSI (Pressure Stall Information) . Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionIOPressure?: string | readonly string[];
  /** May be used to check whether a specific kernel command line option is set (or if prefixed with the exclamation mark — unset). The argument must either be a single word, or an assignment (i.e. two words, separated by =). In the former case the kernel command line is searched for the word appearing as is, or as left hand side of an assignment. In the latter case, the exact assignment is looked for with right and left hand side matching. This operates on the kernel command line communicated to userspace via /proc/cmdline, except when the service manager is invoked as payload of a container manager, in which case the command line of PID 1 is used instead (i.e. /proc/1/cmdline). Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionKernelCommandLine?: string | readonly string[];
  /** Test whether the specified kernel module has been loaded and is already fully initialized. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionKernelModuleLoaded?: string | readonly string[];
  /** May be used to check whether the kernel version (as reported by uname -r) matches a certain expression, or if prefixed with the exclamation mark, does not match. The argument must be a list of (potentially quoted) expressions. Each expression starts with one of = or != for string comparisons, <, <=, ==, <>, >=, > for version comparisons, or $=, !$= for a shell-style glob match. If no operator is specified, $= is implied. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionKernelVersion?: string | readonly string[];
  /** Verify that the specified amount of system memory is available to the current system. Takes a memory size in bytes as argument, optionally prefixed with a comparison operator <, <=, = (or ==), != (or <>), >=, >. On bare-metal systems compares the amount of physical memory in the system with the specified size, adhering to the specified comparison operator. In containers compares the amount of memory assigned to the container instead. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionMemory?: number | string | readonly (number | string)[];
  /** Verify that the overall system (memory, CPU or IO) pressure is below or equal to a threshold. This setting takes a threshold value as argument. It can be specified as a simple percentage value, suffixed with %, in which case the pressure will be measured as an average over the last five minutes before the attempt to start the unit is performed. Alternatively, the average timespan can also be specified using / as a separator, for example: 10%/1min. The supported timespans match what the kernel provides, and are limited to 10sec, 1min and 5min. The full PSI will be checked first, and if not found some will be checked. For more details, see the documentation on PSI (Pressure Stall Information) . Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionMemoryPressure?: string | readonly string[];
  /** Takes one of /var/ or /etc/ as argument, possibly prefixed with a ! (to invert the condition). This condition may be used to conditionalize units on whether the specified directory requires an update because /usr/'s modification time is newer than the stamp file .updated in the specified directory. This is useful to implement offline updates of the vendor operating system resources in /usr/ that require updating of /etc/ or /var/ on the next following boot. Units making use of this condition should order themselves before systemd-update-done.service8, to make sure they run before the stamp file's modification time gets reset indicating a completed update. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionNeedsUpdate?: string | readonly string[];
  /** Verify that a specific key=value pair is set in the host's os-release5. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionOSRelease?: string | readonly string[];
  /** Check for the existence of a file. If the specified absolute path name does not exist, the condition will fail. If the absolute path name passed to ConditionPathExists= is prefixed with an exclamation mark (!), the test is negated, and the unit is only started if the path does not exist. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathExists?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but checks for the existence of at least one file or directory matching the specified globbing pattern. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathExistsGlob?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a directory. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathIsDirectory?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that the underlying file system's backing block device is encrypted using dm-crypt/LUKS. Note that this check does not cover ext4 per-directory encryption, and only detects block level encryption. Moreover, if the specified path resides on a file system on top of a loopback block device, only encryption above the loopback device is detected. It is not detected whether the file system backing the loopback block device is encrypted. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathIsEncrypted?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a mount point. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathIsMountPoint?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that the underlying file system is readable and writable (i.e. not mounted read-only). Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathIsReadWrite?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a socket. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathIsSocket?: string | readonly string[];
  /** Similar to `ConditionPathExists=`, but verifies that a certain path exists and is a symbolic link. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionPathIsSymbolicLink?: string | readonly string[];
  /** May be used to check whether the given security technology is enabled on the system. Currently, the following values are recognized:. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionSecurity?: string | readonly string[];
  /** Takes a numeric UID, a UNIX user name, or the special value @system. This condition may be used to check whether the service manager is running as the given user. The special value @system can be used to check if the user id is within the system user range. This option is not useful for system services, as the system manager exclusively runs as the root user, and thus the test result is constant. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionUser?: string | readonly string[];
  /** May be used to check whether a software version matches a certain expression, or if prefixed with the exclamation mark, does not match. The first argument is the software whose version has to be checked. Currently kernel, systemd and glibc are supported. If this argument is omitted, kernel is implied. The second argument must be a list of (potentially quoted) expressions. Each expression starts with one of = or != for string comparisons, <, <=, ==, <>, >=, > for version comparisons, or $=, !$= for a shell-style glob match. If no operator is specified, $= is implied. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionVersion?: string | readonly string[];
  /** Check whether the system is executed in a virtualized environment and optionally test whether it is a specific implementation. Takes either boolean value to check if being executed in any virtualized environment, or one of vm and container to test against a generic type of virtualization solution, or one of qemu, kvm, amazon, zvm, vmware, microsoft, oracle, powervm, xen, bochs, uml, bhyve, qnx, apple, sre, openvz, lxc, lxc-libvirt, systemd-nspawn, docker, podman, rkt, wsl, proot, pouch, acrn to test against a specific implementation, or private-users to check whether we are running in a user namespace. See systemd-detect-virt1 for a full list of known virtualization technologies and their identifiers. If multiple virtualization technologies are nested, only the innermost is considered. The test may be negated by prepending an exclamation mark. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ConditionVirtualization?: boolean | string | readonly (boolean | string)[];
  /** A space-separated list of unit names. Configures negative requirement dependencies. If a unit has a Conflicts= requirement on a set of other units, then starting it will stop all of them and starting any of them will stop it. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Conflicts?: string | readonly string[];
  /** If yes, (the default), a few default dependencies will implicitly be created for the unit. The actual dependencies created depend on the unit type. For example, for service units, these dependencies ensure that the service is started only after basic system initialization is completed and is properly terminated on system shutdown. See the respective man pages for details. Generally, only services involved with early boot or late shutdown should set this option to no. It is highly recommended to leave this option enabled for the majority of common units. If set to no, this option does not disable all implicit dependencies, just non-essential ones. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly DefaultDependencies?: boolean;
  /** A brief, meaningful, human-readable text identifying the unit. This may be used by systemd (and suitable UIs) as a user-visible label for the unit, so this string should identify the unit rather than just describe it, despite the name. This string also should not just repeat the unit name. Apache HTTP Server or Postfix Mail Server are good examples. Bad examples are high-performance lightweight HTTP server (too generic) or Apache (meaningless for people who do not know the Apache HTTP server project, duplicates the unit name). systemd may use this string as a noun in status messages (Starting Description..., Started Description., Reached target Description., Failed to start Description.), so it should be capitalized, and should not be a full sentence, or a phrase with a verb conjugated in the present continuous, or end in a full stop. Bad examples include exiting the container, updating the database once per day., or OpenSSH server second instance daemon. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Description?: string;
  /** A space-separated list of URIs referencing documentation for this unit or its configuration. Accepted are only URIs of the types http://, https://, file:, info:, man:. For more information about the syntax of these URIs, see uri(7). The URIs should be listed in order of relevance, starting with the most relevant. It is a good idea to first reference documentation that explains what the unit's purpose is, followed by how it is configured, followed by any other related documentation. This option may be specified more than once, in which case the specified list of URIs is merged. If the empty string is assigned to this option, the list is reset and all prior assignments will have no effect. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Documentation?: string | readonly string[];
  /** Action to take when the unit stops in a failed state. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly FailureAction?: UnitActionDirectiveValue;
  /** Exit status to propagate when `FailureAction=` triggers `exit` or `exit-force`. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly FailureActionExitStatus?: string | number;
  /** If true, this unit will not be stopped when isolating another unit. Defaults to false for service, target, socket, timer, and path units, and true for slice, scope, device, swap, mount, and automount units. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly IgnoreOnIsolate?: boolean;
  /** Timeout that starts once the queued job actually begins running. If it expires, the job is cancelled without changing the unit state. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly JobRunningTimeoutSec?: number | string;
  /** Extra action to take when `JobTimeoutSec=` or `JobRunningTimeoutSec=` expires. Uses the same action values as `FailureAction=` and `SuccessAction=`. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly JobTimeoutAction?: UnitActionDirectiveValue;
  /** Optional reboot argument to pass when `JobTimeoutAction=` performs a reboot-style action. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly JobTimeoutRebootArgument?: string;
  /** Timeout for the whole queued job, starting when the job is first enqueued. If it expires, the job is cancelled without changing the unit state. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly JobTimeoutSec?: number | string;
  /** For units that start processes (such as service units), lists one or more other units whose network and/or temporary file namespace to join. If this is specified on a unit (say, a.service has JoinsNamespaceOf=b.service), then the inverse dependency (JoinsNamespaceOf=a.service for b.service) is implied. This only applies to unit types which support the PrivateNetwork=, NetworkNamespacePath=, PrivateIPC=, IPCNamespacePath=, and PrivateTmp= directives (see systemd.exec5 for details). If a unit that has this setting set is started, its processes will see the same /tmp/, /var/tmp/, IPC namespace and network namespace as one listed unit that is started. If multiple listed units are already started and these do not share their namespace, then it is not defined which namespace is joined. Note that this setting only has an effect if PrivateNetwork=/NetworkNamespacePath=, PrivateIPC=/IPCNamespacePath= and/or PrivateTmp= is enabled for both the unit that joins the namespace and the unit whose namespace is joined. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly JoinsNamespaceOf?: string | readonly string[];
  /** A space-separated list of one or more units that are activated when this unit enters the failed state. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly OnFailure?: string | readonly string[];
  /** Job mode used when enqueuing units listed in `OnFailure=`. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly OnFailureJobMode?: JobModeDirectiveValue;
  /** A space-separated list of one or more units that are activated when this unit enters the inactive state. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly OnSuccess?: string | readonly string[];
  /** Job mode used when enqueuing units listed in `OnSuccess=`. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly OnSuccessJobMode?: JobModeDirectiveValue;
  /** Configures dependencies similar to Requires=, but limited to stopping and restarting of units. When systemd stops or restarts the units listed here, the action is propagated to this unit. Note that this is a one-way dependency — changes to this unit do not affect the listed units. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly PartOf?: string | readonly string[];
  /** Units that should receive reload requests when this unit is reloaded. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly PropagatesReloadTo?: string | readonly string[];
  /** Units that should receive stop requests when this unit is stopped. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly PropagatesStopTo?: string | readonly string[];
  /** Configure the optional argument for the reboot2 system call if StartLimitAction= or FailureAction= is a reboot action. This works just like the optional argument to systemctl reboot command. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly RebootArgument?: string;
  /** If true, this unit can only be activated or deactivated indirectly. In this case, explicit start-up or termination requested by the user is denied, however if it is started or stopped as a dependency of another unit, start-up or termination will succeed. This is mostly a safety feature to ensure that the user does not accidentally activate units that are not intended to be activated explicitly, and not accidentally deactivate units that are not intended to be deactivated. These options default to false. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly RefuseManualStart?: boolean;
  /** If true, this unit can only be activated or deactivated indirectly. In this case, explicit start-up or termination requested by the user is denied, however if it is started or stopped as a dependency of another unit, start-up or termination will succeed. This is mostly a safety feature to ensure that the user does not accidentally activate units that are not intended to be activated explicitly, and not accidentally deactivate units that are not intended to be deactivated. These options default to false. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly RefuseManualStop?: boolean;
  /** Units whose reload requests should also reload this unit. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly ReloadPropagatedFrom?: string | readonly string[];
  /** Similar to Wants=, but declares a stronger requirement dependency. Dependencies of this type may also be configured by adding a symlink to a .requires/ directory accompanying the unit file. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Requires?: string | readonly string[];
  /** Takes a space-separated list of absolute paths. Automatically adds dependencies of type Requires= and After= for all mount units required to access the specified path. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly RequiresMountsFor?: string | readonly string[];
  /** Similar to Requires=. However, if the units listed here are not started already, they will not be started and the starting of this unit will fail immediately. Requisite= does not imply an ordering dependency, even if both units are started in the same transaction. Hence this setting should usually be combined with After=, to ensure this unit is not started before the other unit. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Requisite?: string | readonly string[];
  /** A path to a configuration file this unit has been generated from. This is primarily useful for implementation of generator tools that convert configuration from an external configuration file format into native unit files. This functionality should not be used in normal units. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly SourcePath?: string;
  /** Configure an additional action to take if the rate limit configured with StartLimitIntervalSec= and StartLimitBurst= is hit. Takes the same values as the FailureAction=/SuccessAction= settings. If none is set, hitting the rate limit will trigger no action except that the start will not be permitted. Defaults to none. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly StartLimitAction?: UnitActionDirectiveValue;
  /** See systemd.unit(5) for StartLimitBurst=. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly StartLimitBurst?: number;
  /** Configure unit start rate limiting. Units which are started more than burst times within an interval time span are not permitted to start any more. Use StartLimitIntervalSec= to configure the checking interval and StartLimitBurst= to configure how many starts per interval are allowed. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly StartLimitIntervalSec?: number | string;
  /** Units whose stop requests should also stop this unit. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly StopPropagatedFrom?: string | readonly string[];
  /** If true, this unit will be stopped when it is no longer used. Note that, in order to minimize the work to be executed, systemd will not stop units by default unless they are conflicting with other units, or the user explicitly requested their shut down. If this option is set, a unit will be automatically cleaned up if no other active unit requires it. Defaults to false. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly StopWhenUnneeded?: boolean;
  /** Action to take when the unit stops in an inactive state. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly SuccessAction?: UnitActionDirectiveValue;
  /** Exit status to propagate when `SuccessAction=` triggers `exit` or `exit-force`. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly SuccessActionExitStatus?: string | number;
  /** Defaults to no. If yes, processes belonging to this unit will not be sent the final SIGTERM and SIGKILL signals during the final phase of the system shutdown process. This functionality replaces the older mechanism that allowed a program to set argv[0][0] = '@' as described at systemd and Storage Daemons for the Root File System, which however continues to be supported. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly SurviveFinalKillSignal?: boolean;
  /** Configures dependencies similar to Wants=, but as long as this unit is up, all units listed in Upholds= are started whenever found to be inactive or failed, and no job is queued for them. While a Wants= dependency on another unit has a one-time effect when this units started, a Upholds= dependency on it has a continuous effect, constantly restarting the unit if necessary. This is an alternative to the Restart= setting of service units, to ensure they are kept running whatever happens. The restart happens without delay, and usual per-unit rate-limit applies. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Upholds?: string | readonly string[];
  /** Configures (weak) requirement dependencies on other units. This option may be specified more than once or multiple space-separated units may be specified in one option in which case dependencies for all listed names will be created. Dependencies of this type may also be configured outside of the unit configuration file by adding a symlink to a .wants/ directory accompanying the unit file. For details, see above. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Wants?: string | readonly string[];
  /** Same as RequiresMountsFor=, but adds dependencies of type Wants= instead of Requires=. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly WantsMountsFor?: string | readonly string[];
}

/**
 * Install-time directives interpreted by `systemctl enable` rather than the
 * service manager during normal unit execution.
 *
 * Sources:
 * - systemd v260.1, `systemd.unit(5)`
 */
export interface SystemdInstallSection extends CustomDirectiveSection {
  /** A space-separated list of additional names this unit shall be installed under. The names listed here must have the same suffix (i.e. type) as the unit filename. This option may be specified more than once, in which case all listed names are used. At installation time, systemctl enable will create symlinks from these names to the unit filename. Note that not all unit types support such alias names, and this setting is not supported for them. Specifically, mount, slice, swap, and automount units do not support aliasing. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Alias?: string | readonly string[];
  /** Additional units to install/deinstall when this unit is installed/deinstalled. If the user requests installation/deinstallation of a unit with this option configured, systemctl enable and systemctl disable will automatically install/uninstall units listed in this option as well. This option may be specified more than once, or as a space-separated list of unit names. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly Also?: string | readonly string[];
  /** In template unit files, this specifies for which instance the unit shall be enabled if the template is enabled without any explicitly set instance. This option has no effect in non-template unit files. The specified string must be usable as instance identifier. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly DefaultInstance?: string;
  /** Enable-time reverse `Requires=` relationship: enabling this unit creates `.requires/` links from the listed units to it. This option may be specified more than once, or as a space-separated list of unit names. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly RequiredBy?: string | readonly string[];
  /** Enable-time reverse `Upholds=` relationship: enabling this unit creates `.upholds/` links from the listed units to it. This option may be specified more than once, or as a space-separated list of unit names. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly UpheldBy?: string | readonly string[];
  /** Enable-time reverse `Wants=` relationship: enabling this unit creates `.wants/` links from the listed units to it. This option may be specified more than once, or as a space-separated list of unit names. Source: systemd v260.1, `systemd.unit(5)`. */
  readonly WantedBy?: string | readonly string[];
}

/**
 * Timer-specific directives for `[Timer]` sections.
 *
 * Sources:
 * - systemd v260.1, `systemd.timer(5)`
 */
export interface SystemdTimerSection extends CustomDirectiveSection {
  /** Specify the accuracy the timer shall elapse with. Defaults to 1min. The timer is scheduled to elapse within a time window starting with the time specified in OnCalendar=, OnActiveSec=, OnBootSec=, OnStartupSec=, OnUnitActiveSec= or OnUnitInactiveSec= and ending the time configured with AccuracySec= later. Within this time window, the expiry time will be placed at a host-specific, randomized, but stable position that is synchronized between all local timer units. This is done in order to optimize power consumption to suppress unnecessary CPU wake-ups. To get best accuracy, set this option to 1us. Note that the timer is still subject to the timer slack configured via systemd-system.conf(5)'s TimerSlackNSec= setting. See prctl(2) for details. To optimize power consumption, make sure to set this value as high as possible and as low as necessary. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly AccuracySec?: number | string;
  /** When enabled, the timer schedules the next elapse based on the trigger unit entering inactivity, instead of the last trigger time. This is most apparent in the case where the service unit takes longer to run than the timer interval. With this setting enabled, the timer will schedule the next elapse based on when the service finishes running, and so it will have to wait until the next realtime elapse time to trigger. Otherwise, the default behavior is for the timer unit to immediately trigger again once the service finishes running. This happens because the timer schedules the next elapse based on the previous trigger time, and since the interval is shorter than the service runtime, that elapse will be in the past, causing it to immediately trigger once done. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly DeferReactivation?: boolean;
  /** When enabled, the randomized delay specified by RandomizedDelaySec= is chosen deterministically, and remains stable between all firings of the same timer, even if the manager is restarted. The delay is derived from the machine ID, the manager's user identifier, and the timer unit's name. This effectively creates a unique fixed offset for each timer, reducing the jitter in firings of an individual timer while still avoiding firing at the same time as other similarly configured timers. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly FixedRandomDelay?: boolean;
  /** Defines a timer relative to when the timer unit itself is activated. May be specified more than once, and may be combined with other timer expressions. Assigning the empty string resets the full timer expression list. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnActiveSec?: number | string | readonly (number | string)[];
  /** Defines a timer relative to machine boot; in containers this is mapped to OnStartupSec= for the system manager. May be specified more than once, and may be combined with other timer expressions. Assigning the empty string resets the full timer expression list. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnBootSec?: number | string | readonly (number | string)[];
  /** Defines realtime (i.e. wallclock) timers with calendar event expressions. See systemd.time(7) for more information on the syntax of calendar event expressions. Otherwise, the semantics are similar to OnActiveSec= and related settings. May be specified more than once, and may be combined with monotonic timer expressions. Assigning the empty string resets the full timer expression list. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnCalendar?: string | readonly string[];
  /** Triggers the associated unit when CLOCK_REALTIME jumps relative to CLOCK_MONOTONIC. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnClockChange?: boolean;
  /** Defines a timer relative to when the service manager first started, which is especially useful in per-user managers. May be specified more than once, and may be combined with other timer expressions. Assigning the empty string resets the full timer expression list. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnStartupSec?: number | string | readonly (number | string)[];
  /** Triggers the associated unit when the local system timezone changes. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnTimezoneChange?: boolean;
  /** Defines a timer relative to when the triggered unit was last activated. May be specified more than once, and may be combined with other timer expressions. Assigning the empty string resets the full timer expression list. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnUnitActiveSec?: number | string | readonly (number | string)[];
  /** Defines a timer relative to when the triggered unit was last deactivated. May be specified more than once, and may be combined with other timer expressions. Assigning the empty string resets the full timer expression list. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly OnUnitInactiveSec?: number | string | readonly (number | string)[];
  /** Stores the last trigger time on disk so a missed `OnCalendar=` firing can be caught up when the timer becomes active again. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly Persistent?: boolean;
  /** Delay the timer by a randomly selected, evenly distributed amount of time between 0 and the specified time value. Defaults to 0, indicating that no randomized delay shall be applied. Each timer unit will determine this delay randomly before each iteration, unless modified with FixedRandomDelay=, see below. The delay is added on top of the next determined elapsing time or the service manager's startup time, whichever is later. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly RandomizedDelaySec?: number | string;
  /** Offsets the timer by a stable, randomly-selected, and evenly distributed amount of time between 0 and the specified time value. Defaults to 0, indicating that no such offset shall be applied. The offset is chosen deterministically, and is derived the same way as FixedRandomDelay=, see above. The offset is added on top of the next determined elapsing time. This setting only has an effect on timers configured with OnCalendar=, and it can be combined with RandomizedDelaySec=. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly RandomizedOffsetSec?: number | string;
  /** If true, a timer will stay loaded, and its state remains queryable even after it elapsed and the associated unit (as configured with Unit=, see above) deactivated again. If false, an elapsed timer unit that cannot elapse anymore is unloaded once its associated unit deactivated again. Turning this off is particularly useful for transient timer units. Note that this setting has an effect when repeatedly starting a timer unit: if RemainAfterElapse= is on, starting the timer a second time has no effect. However, if RemainAfterElapse= is off and the timer unit was already unloaded, it can be started again, and thus the service can be triggered multiple times. Defaults to true. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly RemainAfterElapse?: boolean;
  /** The unit to activate when this timer elapses. The argument is a unit name, whose suffix is not .timer. If not specified, this value defaults to a service that has the same name as the timer unit, except for the suffix. (See above.) It is recommended that the unit name that is activated and the unit name of the timer unit are named identically, except for the suffix. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly Unit?: string;
  /** If true, an elapsing timer will cause the system to resume from suspend, should it be suspended and if the system supports this. Note that this option will only make sure the system resumes on the appropriate times, it will not take care of suspending it again after any work that is to be done is finished. Defaults to false. Source: systemd v260.1, `systemd.timer(5)`. */
  readonly WakeSystem?: boolean;
}

/**
 * Service-specific and shared execution directives for `[Service]` sections.
 *
 * This interface includes directives from `systemd.service(5)`,
 * `systemd.exec(5)`, `systemd.kill(5)`, and
 * `systemd.resource-control(5)` as of systemd v260.1.
 */
export interface SystemdServiceSection extends CustomDirectiveSection {
  /** This setting controls the cpuset controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly AllowedCPUs?: string;
  /** These settings control the cpuset controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly AllowedMemoryNodes?: string;
  /** Controls which capabilities to include in the ambient capability set for the executed process. Takes a whitespace-separated list of capability names, e.g. CAP_SYS_ADMIN, CAP_DAC_OVERRIDE, CAP_SYS_PTRACE. This option may appear more than once, in which case the ambient capability sets are merged (see the above examples in CapabilityBoundingSet=). If the list of capabilities is prefixed with ~, all but the listed capabilities will be included, the effect of the assignment inverted. If the empty string is assigned to this option, the ambient capability set is reset to the empty capability set, and all prior settings have no effect. If set to ~ (without any further argument), the ambient capability set is reset to the full set of available capabilities, also undoing any previous settings. Note that adding capabilities to the ambient capability set adds them to the process's inherited capability set. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly AmbientCapabilities?: string | readonly string[];
  /** Takes a profile name as argument. The process executed by the unit will switch to this profile when started. Profiles must already be loaded in the kernel, or the unit will fail. If prefixed by -, all errors will be ignored. This setting has no effect if AppArmor is not enabled. This setting does not affect commands prefixed with +. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly AppArmorProfile?: string;
  /** Accepts a list of BPF attach points to allow or any to allow everything. Defaults to none. The accepted values are: This will set the delegate_attachs bpffs mount option. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly BPFDelegateAttachments?: string | readonly string[];
  /** Accepts a list of BPF commands to allow or any to allow everything. Defaults to none. The accepted values are: This will set the delegate_cmds bpffs mount option. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly BPFDelegateCommands?: string | readonly string[];
  /** Accepts a list of BPF maps to allow or any to allow everything. Defaults to none. The accepted values are: This will set the delegate_maps bpffs mount option. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly BPFDelegateMaps?: string | readonly string[];
  /** Accepts a list of BPF programs to allow or any to allow everything. Defaults to none. The accepted values are: This will set the delegate_progs bpffs mount option. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly BPFDelegatePrograms?: string | readonly string[];
  /** Allows attaching custom BPF programs to the cgroup of a unit. (This generalizes the functionality exposed via IPEgressFilterPath= and IPIngressFilterPath= for other hooks.) Cgroup-bpf hooks in the form of BPF programs loaded to the BPF filesystem are attached with cgroup-bpf attach flags determined by the unit. For details about attachment types and flags see bpf.h. Also refer to the general BPF documentation. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly BPFProgram?: string | readonly string[];
  /** If true, sockets from systemd-journald.socket8 will be bind mounted into the mount namespace. This is particularly useful when a different instance of /run/ is employed, to make sure processes running in the namespace can still make use of sd-journal3. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly BindLogSockets?: boolean;
  /** Takes the name of a network interface. This option causes every socket created by processes of this unit to be bound to the specified network interface. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly BindNetworkInterface?: string;
  /** Configures unit-specific bind mounts. A bind mount makes a particular file or directory available at an additional place in the unit's view of the file system. Any bind mounts created with this option are specific to the unit, and are not visible in the host's mount table. This option expects a whitespace separated list of bind mount definitions. Each definition consists of a colon-separated triple of source path, destination path and option string, where the latter two are optional. If only a source path is specified the source and destination is taken to be the same. The option string may be either rbind or norbind for configuring a recursive or non-recursive bind mount. If the destination path is omitted, the option string must be omitted too. Each bind mount definition may be prefixed with -, in which case it will be ignored when its source path does not exist or is not accessible. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly BindPaths?: string | readonly string[];
  /** Configures unit-specific bind mounts. A bind mount makes a particular file or directory available at an additional place in the unit's view of the file system. Any bind mounts created with this option are specific to the unit, and are not visible in the host's mount table. This option expects a whitespace separated list of bind mount definitions. Each definition consists of a colon-separated triple of source path, destination path and option string, where the latter two are optional. If only a source path is specified the source and destination is taken to be the same. The option string may be either rbind or norbind for configuring a recursive or non-recursive bind mount. If the destination path is omitted, the option string must be omitted too. Each bind mount definition may be prefixed with -, in which case it will be ignored when its source path does not exist or is not accessible. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly BindReadOnlyPaths?: string | readonly string[];
  /** Takes a D-Bus destination name that this service shall use. This option is mandatory for services where Type= is set to dbus. It is recommended to always set this property if known to make it easy to map the service name to the D-Bus destination. In particular, systemctl service-log-level/service-log-target verbs make use of this. Source: systemd v260.1, `systemd.service(5)`. */
  readonly BusName?: string;
  /** Controls the CPU affinity of the executed processes. Takes a list of CPU indices or ranges separated by either whitespace or commas. Alternatively, takes a special "numa" value in which case systemd automatically derives allowed CPU range based on the value of NUMAMask= option. CPU ranges are specified by the lower and upper CPU indices separated by a dash. This option may be specified more than once, in which case the specified CPU affinity masks are merged. If the empty string is assigned, the mask is reset, all assignments prior to this will have no effect. See sched_setaffinity(2) for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CPUAffinity?: string | readonly string[];
  /** This setting controls the cpu controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly CPUQuota?: number | string;
  /** This setting controls the cpu controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly CPUQuotaPeriodSec?: number | string;
  /** Sets the CPU scheduling policy for executed processes. Takes one of other, batch, idle, fifo, rr or ext. See sched_setscheduler(2) for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CPUSchedulingPolicy?: CPUSchedulingPolicyDirectiveValue;
  /** Sets the CPU scheduling priority for executed processes. The available priority range depends on the selected CPU scheduling policy (see above). For real-time scheduling policies an integer between 1 (lowest priority) and 99 (highest priority) can be used. In case of CPU resource contention, smaller values mean less CPU time is made available to the service, larger values mean more. See sched_setscheduler(2) for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CPUSchedulingPriority?: number;
  /** If true, elevated CPU scheduling priorities and policies will be reset when the executed processes call fork2, and can hence not leak into child processes. See sched_setscheduler(2) for details. Defaults to false. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CPUSchedulingResetOnFork?: boolean;
  /** These settings control the cpu controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly CPUWeight?: number | string;
  /** Relative cache directories to create for the service under `/var/cache`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CacheDirectory?: string;
  /** Enables project-quota accounting for directories created by `CacheDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CacheDirectoryAccounting?: boolean;
  /** File mode to apply to directories created by `CacheDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CacheDirectoryMode?: string;
  /** Storage quota for directories created by `CacheDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CacheDirectoryQuota?: number | string;
  /** Controls which capabilities to include in the capability bounding set for the executed process. See capabilities(7) for details. Takes a whitespace-separated list of capability names, e.g. CAP_SYS_ADMIN, CAP_DAC_OVERRIDE, CAP_SYS_PTRACE. Capabilities listed will be included in the bounding set, all others are removed. If the list of capabilities is prefixed with ~, all but the listed capabilities will be included, the effect of the assignment inverted. Note that this option also affects the respective capabilities in the effective, permitted and inheritable capability sets. If this option is not used, the capability bounding set is not modified on process execution, hence no limits on the capabilities of the process are enforced. This option may appear more than once, in which case the bounding sets are merged by OR, or by AND if the lines are prefixed with ~ (see below). If the empty string is assigned to this option, the bounding set is reset to the empty capability set, and all prior settings have no effect. If set to ~ (without any further argument), the bounding set is reset to the full set of available capabilities, also undoing any previous settings. This does not affect commands prefixed with +. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CapabilityBoundingSet?: string | readonly string[];
  /** Relative configuration directories to create for the service under `/etc`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ConfigurationDirectory?: string;
  /** File mode to apply to directories created by `ConfigurationDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ConfigurationDirectoryMode?: string;
  /** Controls which types of memory mappings will be saved if the process dumps core (using the /proc/pid/coredump_filter file). Takes a whitespace-separated combination of mapping type names or numbers (with the default base 16). Mapping type names are private-anonymous, shared-anonymous, private-file-backed, shared-file-backed, elf-headers, private-huge, shared-huge, private-dax, shared-dax, and the special values all (all types) and default (the kernel default of private-anonymous shared-anonymous elf-headers private-huge). See core(5) for the meaning of the mapping types. When specified multiple times, all specified masks are ORed. When not set, or if the empty value is assigned, the inherited value is not changed. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly CoredumpFilter?: string | readonly string[];
  /** This setting is used to enable coredump forwarding for containers that belong to this unit's cgroup. Units with CoredumpReceive=yes must also be configured with Delegate=yes. Defaults to false. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly CoredumpReceive?: boolean;
  /** Turns on delegation of further resource control partitioning to processes of the unit. Units where this is enabled may create and manage their own private subhierarchy of control groups below the control group of the unit itself. For unprivileged services (i.e. those using the User= setting) the unit's control group will be made accessible to the relevant user. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly Delegate?: boolean | string | readonly (boolean | string)[];
  /** Delegates ownership of the given namespace types to the user namespace of the processes of this unit. For details about Linux namespaces, see namespaces(7). Either takes a boolean argument, or a space-separated list of namespace type identifiers. If false (the default), the unit's processes' user namespace will not have ownership over any namespaces created during setup of the unit's sandboxed environment. If true, ownership of all namespace types (except for user namespaces, where the concept doesn't apply) created during setup of the unit's sandboxed environment is delegated to the unit's processes' user namespace. Otherwise, a space-separated list of namespace type identifiers must be specified, consisting of any combination of: cgroup, ipc, net, mnt, pid, and uts. All namespaces of the listed types will be owned by the unit's processes' user namespace if they are created during setup of the unit's sandboxed environment (allow-listing). By prepending the list with a single tilde character (~) the effect may be inverted: all namespaces of types not listed and created during setup of the unit's sandboxed environment will be owned by the unit's processes' user namespace (deny-listing). If the empty string is assigned, the default namespace ownership is applied, which is equivalent to false. This option may appear more than once, in which case the namespace types are merged by OR, or by AND if the lines are prefixed with ~ (see examples below). Internally, this setting controls the order in which namespaces are unshared by systemd. Namespace types that should be owned by the unit's processes' user namespace will be unshared after unsharing the user namespace. Internally, this setting controls the order in which namespaces are unshared. Delegated namespaces will be unshared after the user namespace is unshared. Other namespaces will be unshared before the user namespace is unshared. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly DelegateNamespaces?: boolean | string | readonly (boolean | string)[];
  /** Place unit processes in the specified subgroup of the unit's control group. Takes a valid control group name (not a path!) as parameter, or an empty string to turn this feature off. Defaults to off. The control group name must be usable as filename and avoid conflicts with the kernel's control group attribute files (i.e. cgroup.procs is not an acceptable name, since the kernel exposes a native control group attribute file by that name). This option has no effect unless control group delegation is turned on via Delegate=, see above. Note that this setting only applies to "main" processes of a unit, i.e. for services to ExecStart=, but not for ExecReload= and similar. If delegation is enabled, the latter are always placed inside a subgroup named .control. The specified subgroup is automatically created (and potentially ownership is passed to the unit's configured user/group) when a process is started in it. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly DelegateSubgroup?: string;
  /** Control access to specific device nodes by the executed processes. Takes two space-separated strings: a device node specifier followed by a combination of r, w, m to control reading, writing, or creation of the specific device nodes by the unit (mknod), respectively. This functionality is implemented using eBPF filtering. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly DeviceAllow?: string | readonly string[];
  /** Control the policy for allowing device access:. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly DevicePolicy?: DevicePolicyDirectiveValue;
  /** Disables controllers from being enabled for a unit's children. If a controller listed is already in use in its subtree, the controller will be removed from the subtree. This can be used to avoid configuration in child units from being able to implicitly or explicitly enable a controller. Defaults to empty. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly DisableControllers?: string | readonly string[];
  /** Takes a boolean parameter. If set, a UNIX user and group pair is allocated dynamically when the unit is started, and released as soon as it is stopped. The user and group will not be added to /etc/passwd or /etc/group, but are managed transiently during runtime. The nss-systemd8 glibc NSS module provides integration of these dynamic users/groups into the system's user and group databases. The user and group name to use may be configured via User= and Group= (see above). If these options are not used and dynamic user/group allocation is enabled for a unit, the name of the dynamic user/group is implicitly derived from the unit name. If the unit name without the type suffix qualifies as valid user name it is used directly, otherwise a name incorporating a hash of it is used. If a statically allocated user or group of the configured name already exists, it is used and no dynamic user/group is allocated. Note that if User= is specified and the static group with the name exists, then it is required that the static user with the name already exists. Similarly, if Group= is specified and the static user with the name exists, then it is required that the static group with the name already exists. Dynamic users/groups are allocated from the UID/GID range 61184…65519. It is recommended to avoid this range for regular system or login users. At any point in time each UID/GID from this range is only assigned to zero or one dynamically allocated users/groups in use. However, UID/GIDs are recycled after a unit is terminated. Care should be taken that any processes running as part of a unit for which dynamic users/groups are enabled do not leave files or directories owned by these users/groups around, as a different unit might get the same UID/GID assigned later on, and thus gain access to these files or directories. If DynamicUser= is enabled, RemoveIPC= is implied (and cannot be turned off). This ensures that the lifetime of IPC objects and temporary files created by the executed processes is bound to the runtime of the service, and hence the lifetime of the dynamic user/group. Since /tmp/ and /var/tmp/ are usually the only world-writable directories on a system, unless PrivateTmp= is manually set to true, disconnected would be implied. This ensures that a unit making use of dynamic user/group allocation cannot leave files around after unit termination. Furthermore NoNewPrivileges= and RestrictSUIDSGID= are implicitly enabled (and cannot be disabled), to ensure that processes invoked cannot take benefit or create SUID/SGID files or directories. Moreover, ProtectSystem=strict and ProtectHome=read-only are implied, thus prohibiting the service to write to arbitrary file system locations. In order to allow the service to write to certain directories, they have to be allow-listed using ReadWritePaths=, but care must be taken so that UID/GID recycling does not create security issues involving files created by the service. Use RuntimeDirectory= (see below) in order to assign a writable runtime directory to a service, owned by the dynamic user/group and removed automatically when the unit is terminated. Use StateDirectory=, CacheDirectory= and LogsDirectory= in order to assign a set of writable directories for specific purposes to the service in a way that they are protected from vulnerabilities due to UID reuse (see below). If this option is enabled, care should be taken that the unit's processes do not get access to directories outside of these explicitly configured and managed ones. Specifically, do not use BindPaths= and be careful with AF_UNIX file descriptor passing for directory file descriptors, as this would permit processes to create files or directories owned by the dynamic user/group that are not subject to the lifecycle and access guarantees of the service. Note that this option is currently incompatible with D-Bus policies, thus a service using this option may currently not allocate a D-Bus service name (note that this does not affect calling into other D-Bus services). Defaults to off. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly DynamicUser?: boolean;
  /** Sets environment variables for executed processes. Each line is unquoted using the rules described in "Quoting" section in systemd.syntax7 and becomes a list of variable assignments. If you need to assign a value containing spaces or the equals sign to a variable, put quotes around the whole assignment. Variable expansion is not performed inside the strings and the $ character has no special meaning. Specifier expansion is performed, see the "Specifiers" section in systemd.unit5. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly Environment?: string | readonly string[];
  /** Similar to Environment=, but reads the environment variables from a text file. The text file should contain newline-separated variable assignments. Empty lines, lines without an = separator, or lines starting with ; or # will be ignored, which may be used for commenting. The file must be encoded with UTF-8. Valid characters are unicode scalar values other than unicode noncharacters, U+0000 NUL, and U+FEFF unicode byte order mark. Control codes other than NUL are allowed. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly EnvironmentFile?: string | readonly string[];
  /** Optional commands that are executed before the commands in ExecStartPre=. Syntax is the same as for ExecStart=. Multiple command lines are allowed, regardless of the service type (i.e. Type=), and the commands are executed one after the other, serially. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecCondition?: ExecDirective;
  /** Paths from which execution is explicitly allowed when `NoExecPaths=` is used. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ExecPaths?: string | readonly string[];
  /** Commands to execute to trigger a configuration reload in the service. This setting may take multiple command lines, following the same scheme as described for ExecStart= above. Use of this setting is optional. Specifier and environment variable substitution is supported here following the same scheme as for ExecStart=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecReload?: ExecDirective;
  /** Commands to execute after a successful reload operation. Syntax for this setting is exactly the same as ExecReload=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecReloadPost?: ExecDirective;
  /** Takes a colon separated list of absolute paths relative to which the executable used by the Exec*= (e.g. ExecStart=, ExecStop=, etc.) properties can be found. Overrides $PATH if $PATH is not supplied by the user through Environment=, EnvironmentFile= or PassEnvironment=. Assigning an empty string removes previous assignments and setting ExecSearchPath= to a value multiple times will append to the previous setting. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ExecSearchPath?: string | readonly string[];
  /** Commands that are executed when this service is started. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecStart?: ExecDirective;
  /** Additional commands that are executed before or after the command in ExecStart=, respectively. Syntax is the same as for ExecStart=. Multiple command lines are allowed, regardless of the service type (i.e. Type=), and the commands are executed one after the other, serially. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecStartPost?: ExecDirective;
  /** Additional commands that are executed before or after the command in ExecStart=, respectively. Syntax is the same as for ExecStart=. Multiple command lines are allowed, regardless of the service type (i.e. Type=), and the commands are executed one after the other, serially. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecStartPre?: ExecDirective;
  /** Commands to execute to stop the service started via ExecStart=. This argument takes multiple command lines, following the same scheme as described for ExecStart= above. Use of this setting is optional. After the commands configured in this option are run, it is implied that the service is stopped, and any processes remaining for it are terminated according to the KillMode= setting (see systemd.kill5). If this option is not specified, the process is terminated by sending the signal specified in KillSignal= or RestartKillSignal= when service stop is requested. Specifier and environment variable substitution is supported (including $MAINPID, see above). Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecStop?: ExecDirective;
  /** Additional commands that are executed after the service is stopped. This includes cases where the commands configured in ExecStop= were used, where the service does not have any ExecStop= defined, or where the service exited unexpectedly. This argument takes multiple command lines, following the same scheme as described for ExecStart=. Use of these settings is optional. Specifier and environment variable substitution is supported. Note that – unlike ExecStop= – commands specified with this setting are invoked when a service failed to start up correctly and is shut down again. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExecStopPost?: ExecDirective;
  /** Specifies when the manager should consider the service to be finished. One of main or cgroup:. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ExitType?: ServiceExitTypeDirectiveValue;
  /** This setting is similar to BindReadOnlyPaths= in that it mounts a file system hierarchy from a directory, but instead of providing a destination path, an overlay will be set up. This option expects a whitespace separated list of source directories. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ExtensionDirectories?: string | readonly string[];
  /** Takes an image policy string as per systemd.image-policy7 to use when mounting the disk images (DDI) specified in RootImage=, MountImage=, ExtensionImage=, respectively. If not specified the following policy string is the default for RootImagePolicy= and MountImagePolicy:. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ExtensionImagePolicy?: string;
  /** This setting is similar to MountImages= in that it mounts a file system hierarchy from a block device node or loopback file, but instead of providing a destination path, an overlay will be set up. This option expects a whitespace separated list of mount definitions. Each definition consists of a source path, optionally followed by a colon and a list of mount options. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ExtensionImages?: string | readonly string[];
  /** Configure how many file descriptors may be stored in the service manager for the service using sd_pid_notify_with_fds3's FDSTORE=1 messages. This is useful for implementing services that can restart after an explicit request or a crash without losing state. Any open sockets and other file descriptors which should not be closed during the restart may be stored this way. Application state can either be serialized to a file in RuntimeDirectory=, or stored in a memfd_create2 memory file descriptor. Defaults to 0, i.e. no file descriptors may be stored in the service manager. All file descriptors passed to the service manager from a specific service are passed back to the service's main process on the next service restart (see sd_listen_fds3 for details about the precise protocol used and the order in which the file descriptors are passed). Any file descriptors passed to the service manager are automatically closed when POLLHUP or POLLERR is seen on them, or when the service is fully stopped and no job is queued or being executed for it (the latter can be tweaked with FileDescriptorStorePreserve=, see below). If this option is used, NotifyAccess= (see above) should be set to open access to the notification socket provided by systemd. If NotifyAccess= is not set, it will be implicitly set to main. Source: systemd v260.1, `systemd.service(5)`. */
  readonly FileDescriptorStoreMax?: number;
  /** Takes one of no, yes, restart and controls when to release the service's file descriptor store (i.e. when to close the contained file descriptors, if any). If set to no the file descriptor store is automatically released when the service is stopped; if restart (the default) it is kept around as long as the unit is neither inactive nor failed, or a job is queued for the service, or the service is expected to be restarted. If yes the file descriptor store is kept around until the unit is removed from memory (i.e. is not referenced anymore and inactive). The latter is useful to keep entries in the file descriptor store pinned until the service manager exits. Source: systemd v260.1, `systemd.service(5)`. */
  readonly FileDescriptorStorePreserve?: FileDescriptorStorePreserveDirectiveValue;
  /** Specifies which signal to send to remaining processes after a timeout if SendSIGKILL= is enabled. The signal configured here should be one that is not typically caught and processed by services (SIGTERM is not suitable). Developers can find it useful to use this to generate a coredump to troubleshoot why a service did not terminate upon receiving the initial SIGTERM signal. This can be achieved by configuring LimitCORE= and setting FinalKillSignal= to either SIGQUIT or SIGABRT. Defaults to SIGKILL. Source: systemd v260.1, `systemd.kill(5)`. */
  readonly FinalKillSignal?: NodeJS.Signals | number;
  /** Set the UNIX user or group that the processes are executed as, respectively. Takes a single user or group name, or a numeric ID as argument. For system services (services run by the system service manager, i.e. managed by PID 1) and for user services of the root user (services managed by root's instance of systemd --user), the default is root, but this directive may be used to specify a different identity. For user services of any other user, switching user identity is not permitted, hence the only valid setting is the same user the user's service manager is running as. If no group is set, the default group of the user is used. This setting does not affect commands whose command line is prefixed with +. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly Group?: string;
  /** Takes a boolean value that specifies whether systemd should try to guess the main PID of a service if it cannot be determined reliably. This option is ignored unless Type=forking is set and PIDFile= is unset because for the other types or with an explicitly configured PID file, the main PID is always known. The guessing algorithm might come to incorrect conclusions if a daemon consists of more than one process. If the main PID cannot be determined, failure detection and automatic restarting of a service will not work reliably. Defaults to yes. Source: systemd v260.1, `systemd.service(5)`. */
  readonly GuessMainPID?: boolean;
  /** This setting controls the io controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IOAccounting?: boolean;
  /** This setting controls the io controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IODeviceLatencyTargetSec?: number | string;
  /** This setting controls the io controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IODeviceWeight?: number | string;
  /** These settings control the io controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IOReadBandwidthMax?: string | readonly string[];
  /** These settings control the io controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IOReadIOPSMax?: string | readonly string[];
  /** Sets the I/O scheduling class for executed processes. Takes one of the strings realtime, best-effort or idle. The kernel's default scheduling class is best-effort at a priority of 4. If the empty string is assigned to this option, all prior assignments to both IOSchedulingClass= and IOSchedulingPriority= have no effect. See ioprio_set2 for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly IOSchedulingClass?: IOSchedulingClassDirectiveValue;
  /** Sets the I/O scheduling priority for executed processes. Takes an integer between 0 (highest priority) and 7 (lowest priority). In case of I/O contention, smaller values mean more I/O bandwidth is made available to the unit's processes, larger values mean less bandwidth. The available priorities depend on the selected I/O scheduling class (see above). If the empty string is assigned to this option, all prior assignments to both IOSchedulingClass= and IOSchedulingPriority= have no effect. For the kernel's default scheduling class (best-effort) this defaults to 4. See ioprio_set2 for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly IOSchedulingPriority?: number;
  /** These settings control the io controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IOWeight?: number | string;
  /** See systemd.service(5) for IOWriteBandwidthMax=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly IOWriteBandwidthMax?: string | readonly string[];
  /** See systemd.service(5) for IOWriteIOPSMax=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly IOWriteIOPSMax?: string | readonly string[];
  /** If true, turns on IPv4 and IPv6 network traffic accounting for packets sent or received by the unit. When this option is turned on, all IPv4 and IPv6 sockets created by any process of the unit are accounted for. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IPAccounting?: boolean;
  /** Turn on network traffic filtering for IP packets sent and received over AF_INET and AF_INET6 sockets. Both directives take a space separated list of IPv4 or IPv6 addresses, each optionally suffixed with an address prefix length in bits after a / character. If the suffix is omitted, the address is considered a host address, i.e. the filter covers the whole address (32 bits for IPv4, 128 bits for IPv6). Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IPAddressAllow?: string | readonly string[];
  /** See systemd.service(5) for IPAddressDeny=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly IPAddressDeny?: string | readonly string[];
  /** See systemd.service(5) for IPEgressFilterPath=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly IPEgressFilterPath?: string | readonly string[];
  /** Add custom network traffic filters implemented as BPF programs, applying to all IP packets sent and received over AF_INET and AF_INET6 sockets. Takes an absolute path to a pinned BPF program in the BPF virtual filesystem (/sys/fs/bpf/). Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly IPIngressFilterPath?: string | readonly string[];
  /** Takes an absolute file system path referring to a Linux IPC namespace pseudo-file (i.e. a file like /proc/$PID/ns/ipc or a bind mount or symlink to one). When set the invoked processes are added to the network namespace referenced by that path. The path has to point to a valid namespace file at the moment the processes are forked off. If this option is used PrivateIPC= has no effect. If this option is used together with JoinsNamespaceOf= then it only has an effect if this unit is started before any of the listed units that have PrivateIPC= or IPCNamespacePath= configured, as otherwise the network namespace of those units is reused. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly IPCNamespacePath?: string;
  /** If true, SIGPIPE is ignored in the executed process. Defaults to true since SIGPIPE is generally only useful in shell pipelines. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly IgnoreSIGPIPE?: boolean;
  /** Pass one or more credentials to the unit. Takes a credential name for which we will attempt to find a credential that the service manager itself received under the specified name — which may be used to propagate credentials from an invoking environment (e.g. a container manager that invoked the service manager) into a service. If the credential name is a glob, all credentials matching the glob are passed to the unit. Matching credentials are searched for in the system credentials, the encrypted system credentials, and under /etc/credstore/, /run/credstore/, /usr/lib/credstore/, /run/credstore.encrypted/, /etc/credstore.encrypted/, and /usr/lib/credstore.encrypted/ in that order. When multiple credentials of the same name are found, the first one found is used. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ImportCredential?: string | readonly string[];
  /** Paths that should be hidden entirely from the service. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly InaccessiblePaths?: string | readonly string[];
  /** Controls how the kernel session keyring is set up for the service (see session-keyring7 for details on the session keyring). Takes one of inherit, private, shared. If set to inherit no special keyring setup is done, and the kernel's default behaviour is applied. If private is used a new session keyring is allocated when a service process is invoked, and it is not linked up with any user keyring. This is the recommended setting for system services, as this ensures that multiple services running under the same system user ID (in particular the root user) do not share their key material among each other. If shared is used a new session keyring is allocated as for private, but the user keyring of the user configured with User= is linked into it, so that keys assigned to the user may be requested by the unit's processes. In this mode multiple units running processes under the same user ID may share key material. Unless inherit is selected the unique invocation ID for the unit (see below) is added as a protected key by the name invocation_id to the newly created session keyring. Defaults to private for services of the system service manager and to inherit for non-service units and for services of the user service manager. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly KeyringMode?: KeyringModeDirectiveValue;
  /** Specifies how processes of this unit shall be killed. One of control-group, mixed, process, none. Source: systemd v260.1, `systemd.kill(5)`. */
  readonly KillMode?: "control-group" | "mixed" | "process" | "none";
  /** Specifies which signal to use when stopping a service. This controls the signal that is sent as first step of shutting down a unit (see above), and is usually followed by SIGKILL (see above and below). For a list of valid signals, see signal(7). Defaults to SIGTERM. Source: systemd v260.1, `systemd.kill(5)`. */
  readonly KillSignal?: NodeJS.Signals | number;
  /** Maximum address-space size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitAS?: ProcessResourceLimitDirectiveValue;
  /** Maximum core-file size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitCORE?: ProcessResourceLimitDirectiveValue;
  /** Maximum CPU time for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitCPU?: ProcessResourceLimitDirectiveValue;
  /** Maximum data-segment size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitDATA?: ProcessResourceLimitDirectiveValue;
  /** Maximum created-file size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitFSIZE?: ProcessResourceLimitDirectiveValue;
  /** Maximum number of file locks for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitLOCKS?: ProcessResourceLimitDirectiveValue;
  /** Maximum locked-in-memory size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitMEMLOCK?: ProcessResourceLimitDirectiveValue;
  /** Maximum POSIX message-queue size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitMSGQUEUE?: ProcessResourceLimitDirectiveValue;
  /** Maximum nice-priority adjustment for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitNICE?: ProcessResourceLimitDirectiveValue;
  /** Maximum number of open file descriptors for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitNOFILE?: ProcessResourceLimitDirectiveValue;
  /** Maximum number of processes or threads for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitNPROC?: ProcessResourceLimitDirectiveValue;
  /** Maximum resident-set size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitRSS?: ProcessResourceLimitDirectiveValue;
  /** Maximum real-time scheduling priority for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitRTPRIO?: ProcessResourceLimitDirectiveValue;
  /** Maximum real-time CPU time for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitRTTIME?: ProcessResourceLimitDirectiveValue;
  /** Maximum number of queued signals for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitSIGPENDING?: ProcessResourceLimitDirectiveValue;
  /** Maximum stack size for processes started by the unit. Accepts the usual `soft:hard` syntax, `infinity`, and unit suffixes where systemd allows them. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LimitSTACK?: ProcessResourceLimitDirectiveValue;
  /** Pass a credential to the unit. Credentials are limited-size binary or textual objects that may be passed to unit processes. They are primarily intended for passing cryptographic keys (both public and private) or certificates, user account information or identity information from host to services, but can be freely used to pass any kind of limited-size information to a service. The data is accessible from the unit's processes via the file system, at a read-only location that (if possible and permitted) is backed by non-swappable memory. The data is only accessible to the user associated with the unit, via the User=/DynamicUser= settings (as well as the superuser). When available, the location of credentials is exported as the $CREDENTIALS_DIRECTORY environment variable to the unit's processes. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LoadCredential?: string | readonly string[];
  /** Pass a credential to the unit. Credentials are limited-size binary or textual objects that may be passed to unit processes. They are primarily intended for passing cryptographic keys (both public and private) or certificates, user account information or identity information from host to services, but can be freely used to pass any kind of limited-size information to a service. The data is accessible from the unit's processes via the file system, at a read-only location that (if possible and permitted) is backed by non-swappable memory. The data is only accessible to the user associated with the unit, via the User=/DynamicUser= settings (as well as the superuser). When available, the location of credentials is exported as the $CREDENTIALS_DIRECTORY environment variable to the unit's processes. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LoadCredentialEncrypted?: string | readonly string[];
  /** If set, locks down the personality2 system call so that the kernel execution domain may not be changed from the default or the personality selected with Personality= directive. This may be useful to improve security, because odd personality emulations may be poorly tested and source of vulnerabilities. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LockPersonality?: boolean;
  /** Configures additional log metadata fields to include in all log records generated by processes associated with this unit, including systemd. This setting takes one or more journal field assignments in the format FIELD=VALUE separated by whitespace. See systemd.journal-fields7 for details on the journal field concept. Even though the underlying journal implementation permits binary field values, this setting accepts only valid UTF-8 values. To include space characters in a journal field value, enclose the assignment in double quotes ("). The usual specifiers are expanded in all assignments (see below). Note that this setting is not only useful for attaching additional metadata to log records of a unit, but given that all fields and values are indexed may also be used to implement cross-unit log record matching. Assign an empty string to reset the list. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogExtraFields?: string | readonly string[];
  /** Define an extended regular expression to filter log messages based on the MESSAGE= field of the structured message. If the first character of the pattern is ~, log entries matching the pattern should be discarded. This option takes a single pattern as an argument but can be used multiple times to create a list of allowed and denied patterns. If the empty string is assigned, the filter is reset, and all prior assignments will have no effect. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogFilterPatterns?: string | readonly string[];
  /** Sets the maximum log level for log messages generated by this unit. Takes a syslog log level, one of emerg (lowest log level, only highest priority messages), alert, crit, err, warning, notice, info, debug (highest log level, also lowest priority messages). See syslog3 for details. By default, the maximum log level is not overridden. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogLevelMax?: SyslogLevelDirectiveValue;
  /** Run the unit's processes in the specified journal namespace. Expects a short user-defined string identifying the namespace. If not used the processes of the service are run in the default journal namespace, i.e. their log stream is collected and processed by systemd-journald.service. If this option is used any log data generated by processes of this unit (regardless of whether via the syslog(), journal native logging or stdout/stderr logging) is collected and processed by an instance of the systemd-journald@.service template unit, which manages the specified namespace. The log data is stored in a data store independent from the default log namespace's data store. See systemd-journald.service8 for details about journal namespaces. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogNamespace?: string;
  /** Configures the rate limiting that is applied to log messages generated by this unit. If, in the time interval defined by LogRateLimitIntervalSec=, more messages than specified in LogRateLimitBurst= are logged by a service, all further messages within the interval are dropped until the interval is over. A message about the number of dropped messages is generated. The time specification for LogRateLimitIntervalSec= may be specified in the following units: "s", "min", "h", "ms", "us". See systemd.time(7) for details. The default settings are set by RateLimitIntervalSec= and RateLimitBurst= configured in journald.conf5. Note that this only applies to log messages that are processed by the logging subsystem, i.e. by systemd-journald.service8. This means that if you connect a service's stderr directly to a file via StandardOutput=file:… or a similar setting, the rate limiting will not be applied to messages written that way (but it will be enforced for messages generated via syslog3 and similar functions). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogRateLimitBurst?: number;
  /** Configures the rate limiting that is applied to log messages generated by this unit. If, in the time interval defined by LogRateLimitIntervalSec=, more messages than specified in LogRateLimitBurst= are logged by a service, all further messages within the interval are dropped until the interval is over. A message about the number of dropped messages is generated. The time specification for LogRateLimitIntervalSec= may be specified in the following units: "s", "min", "h", "ms", "us". See systemd.time(7) for details. The default settings are set by RateLimitIntervalSec= and RateLimitBurst= configured in journald.conf5. Note that this only applies to log messages that are processed by the logging subsystem, i.e. by systemd-journald.service8. This means that if you connect a service's stderr directly to a file via StandardOutput=file:… or a similar setting, the rate limiting will not be applied to messages written that way (but it will be enforced for messages generated via syslog3 and similar functions). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogRateLimitIntervalSec?: number | string;
  /** Relative log directories to create for the service under `/var/log`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogsDirectory?: string;
  /** Enables project-quota accounting for directories created by `LogsDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogsDirectoryAccounting?: boolean;
  /** File mode to apply to directories created by `LogsDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogsDirectoryMode?: string;
  /** Storage quota for directories created by `LogsDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly LogsDirectoryQuota?: number | string;
  /** See systemd.service(5) for ManagedOOMMemoryPressure=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ManagedOOMMemoryPressure?: ManagedOOMDirectiveValue;
  /** Overrides the default memory pressure duration set by oomd.conf5 for the cgroup of this unit. The specified value supports a time unit such as ms or μs, see systemd.time(7) for details on the permitted syntax. Must be set to either empty or a value of at least 1s. Defaults to empty, which means to use the default set by oomd.conf5. This property is ignored unless ManagedOOMMemoryPressure=kill. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly ManagedOOMMemoryPressureDurationSec?: number | string;
  /** Overrides the default memory pressure limit set by oomd.conf5 for the cgroup of this unit. Takes a percentage value between 0% and 100%, inclusive. Defaults to 0%, which means to use the default set by oomd.conf5. This property is ignored unless ManagedOOMMemoryPressure=kill. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly ManagedOOMMemoryPressureLimit?: string;
  /** Allows deprioritizing or omitting this unit's cgroup as a candidate when systemd-oomd needs to act. Requires support for extended attributes (see xattr7) in order to use avoid or omit. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly ManagedOOMPreference?: ManagedOOMPreferenceDirectiveValue;
  /** Specifies how systemd-oomd.service8 will act on this unit's cgroups. Defaults to auto. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly ManagedOOMSwap?: ManagedOOMDirectiveValue;
  /** This setting controls the memory controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryAccounting?: boolean;
  /** If set, attempts to create memory mappings that are writable and executable at the same time, or to change existing memory mappings to become executable, or mapping shared memory segments as executable, are prohibited. Specifically, a system call filter is added (or preferably, an equivalent kernel check is enabled with prctl(2)) that rejects mmap2 system calls with both PROT_EXEC and PROT_WRITE set, mprotect2 or pkey_mprotect2 system calls with PROT_EXEC set and shmat2 system calls with SHM_EXEC set. Note that this option is incompatible with programs and libraries that generate program code dynamically at runtime, including JIT execution engines, executable stacks, and code "trampoline" feature of various C compilers. This option improves service security, as it makes harder for software exploits to change running code dynamically. However, the protection can be circumvented, if the service can write to a filesystem, which is not mounted with noexec (such as /dev/shm), or it can use memfd_create(). This can be prevented by making such file systems inaccessible to the service (e.g. InaccessiblePaths=/dev/shm) and installing further system call filters (SystemCallFilter=~memfd_create). Note that this feature is fully available on x86-64, and partially on x86. Specifically, the shmat() protection is not available on x86. Note that on systems supporting multiple ABIs (such as x86/x86-64) it is recommended to turn off alternative ABIs for services, so that they cannot be used to circumvent the restrictions of this option. Specifically, it is recommended to combine this option with SystemCallArchitectures=native or similar. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly MemoryDenyWriteExecute?: boolean;
  /** Best-effort memory throttling threshold for the unit cgroup. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryHigh?: number | string;
  /** When set, it enables KSM (kernel samepage merging) for the processes. KSM is a memory-saving de-duplication feature. Anonymous memory pages with identical content can be replaced by a single write-protected page. This feature should only be enabled for jobs that share the same security domain. For details, see Kernel Samepage Merging in the kernel documentation. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly MemoryKSM?: boolean;
  /** See systemd.service(5) for MemoryLow=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly MemoryLow?: number | string;
  /** Hard memory usage limit for the unit cgroup. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryMax?: number | string;
  /** Hard memory protection floor that the kernel should preserve for the unit cgroup. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryMin?: number | string;
  /** Sets the memory pressure threshold time for memory pressure monitor as configured via MemoryPressureWatch=. Specifies the maximum allocation latency before a memory pressure event is signalled to the service, per 2s window. If not specified, defaults to the DefaultMemoryPressureThresholdSec= setting in systemd-system.conf(5) (which in turn defaults to 200ms). The specified value expects a time unit such as ms or μs, see systemd.time(7) for details on the permitted syntax. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryPressureThresholdSec?: number | string;
  /** Supports `auto` and `skip` in addition to booleans. Controls whether systemd exposes memory pressure monitoring information to the service environment. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryPressureWatch?: boolean | "auto" | "skip";
  /** Hard swap usage limit for the unit cgroup. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemorySwapMax?: number | string;
  /** Transparent Hugepages (THPs) is a Linux kernel feature that manages memory using larger pages (2MB on x86, compared to the default 4KB). The main goal is to improve memory management efficiency and system performance, especially for memory-intensive applications. However, it can cause drawbacks in some scenarios, such as memory regression and latency spikes. THP policy is governed for the entire system via /sys/kernel/mm/transparent_hugepage/enabled. However, it can be overridden for individual workloads via prctl(2). This directive may be used to disable THPs at process invocation time to stop providing THPs for workloads where the drawbacks outweigh the advantages. When MemoryTHP= is set to inherit or not set at all, systemd inherits THP settings from the process that starts it and no prctl(2) PR_SET_THP_DISABLE call is made. When set to disable, MemoryTHP= disables THPs completely for the process, irrespecitive of global THP controls. When set to madvise, MemoryTHP= disables THPs for the process except when specifically requested via madvise2 by the process with MADV_HUGEPAGE or MADV_COLLAPSE. When set to system, MemoryTHP= resets the THP policy to system wide policy. This can be used when the process that starts systemd has already disabled THPs via PR_SET_THP_DISABLE, and we want to restore the system default THP setting at process invocation time. For details, see Transparent Hugepage Support in the kernel documentation. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly MemoryTHP?: MemoryTHPDirectiveValue;
  /** Hard zswap usage limit for the unit cgroup. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryZSwapMax?: number | string;
  /** This setting controls the memory controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly MemoryZSwapWriteback?: boolean;
  /** If on, a private mount namespace for the unit's processes is created and the API file systems /proc/, /sys/, /dev/ and /run/ (as an empty tmpfs) are mounted inside of it, unless they are already mounted. Note that this option has no effect unless used in conjunction with RootDirectory=/RootImage= as these four mounts are generally mounted in the host anyway, and unless the root directory is changed, the private mount namespace will be a 1:1 copy of the host's, and include these four mounts. Note that the /dev/ file system of the host is bind mounted if this option is used without PrivateDevices=. To run the service with a private, minimal version of /dev/, combine this option with PrivateDevices=. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly MountAPIVFS?: boolean;
  /** Takes a mount propagation setting: shared, slave or private, which controls whether file system mount points in the file system namespaces set up for this unit's processes will receive or propagate mounts and unmounts from other file system namespaces. See mount(2) for details on mount propagation, and the three propagation flags in particular. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly MountFlags?: MountPropagationDirectiveValue;
  /** Takes an image policy string as per systemd.image-policy7 to use when mounting the disk images (DDI) specified in RootImage=, MountImage=, ExtensionImage=, respectively. If not specified the following policy string is the default for RootImagePolicy= and MountImagePolicy:. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly MountImagePolicy?: string;
  /** This setting is similar to RootImage= in that it mounts a file system hierarchy from a block device node or loopback file, but the destination directory can be specified as well as mount options. This option expects a whitespace separated list of mount definitions. Each definition consists of a colon-separated tuple of source path and destination definitions, optionally followed by another colon and a list of mount options. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly MountImages?: string | readonly string[];
  /** This setting provides a method for integrating dynamic cgroup, user and group IDs into firewall rules with NFT sets. The benefit of using this setting is to be able to use the IDs as selectors in firewall rules easily and this in turn allows more fine grained filtering. NFT rules for cgroup matching use numeric cgroup IDs, which change every time a service is restarted, making them hard to use in systemd environment otherwise. Dynamic and random IDs used by DynamicUser= can be also integrated with this setting. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly NFTSet?: string | readonly string[];
  /** Controls the NUMA node list which will be applied alongside with selected NUMA policy. Takes a list of NUMA nodes and has the same syntax as a list of CPUs for CPUAffinity= option or special "all" value which will include all available NUMA nodes in the mask. Note that the list of NUMA nodes is not required for default and local policies and for preferred policy we expect a single NUMA node. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly NUMAMask?: string | readonly string[];
  /** Controls the NUMA memory policy of the executed processes. Takes a policy type, one of: default, preferred, bind, interleave and local. A list of NUMA nodes that should be associated with the policy must be specified in NUMAMask=. For more details on each policy please see, set_mempolicy(2). For overall overview of NUMA support in Linux see, numa(7). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly NUMAPolicy?: string | readonly string[];
  /** Takes an absolute file system path referring to a Linux network namespace pseudo-file (i.e. a file like /proc/$PID/ns/net or a bind mount or symlink to one). When set the invoked processes are added to the network namespace referenced by that path. The path has to point to a valid namespace file at the moment the processes are forked off. If this option is used PrivateNetwork= has no effect. If this option is used together with JoinsNamespaceOf= then it only has an effect if this unit is started before any of the listed units that have PrivateNetwork= or NetworkNamespacePath= configured, as otherwise the network namespace of those units is reused. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly NetworkNamespacePath?: string;
  /** Sets the default nice level (scheduling priority) for executed processes. Takes an integer between -20 (highest priority) and 19 (lowest priority). In case of resource contention, smaller values mean more resources will be made available to the unit's processes, larger values mean less resources will be made available. See setpriority(2) for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly Nice?: number;
  /** Paths that should be mounted `noexec` for the service. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly NoExecPaths?: string | readonly string[];
  /** If true, ensures that the service process and all its children can never gain new privileges through execve() (e.g. via setuid or setgid bits, or filesystem capabilities). This is the simplest and most effective way to ensure that a process and its children can never elevate privileges again. Defaults to false. In case the service will be run in a new mount namespace anyway and SELinux is disabled, all file systems are mounted with MS_NOSUID flag. Also see No New Privileges Flag. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly NoNewPrivileges?: boolean;
  /** Set the O_NONBLOCK flag for all file descriptors passed via socket-based activation. If true, all file descriptors >= 3 (i.e. all except stdin, stdout, stderr), excluding those passed in via the file descriptor storage logic (see FileDescriptorStoreMax= for details), will have the O_NONBLOCK flag set and hence are in non-blocking mode. This option is only useful in conjunction with a socket unit, as described in systemd.socket5 and has no effect on file descriptors which were previously saved in the file-descriptor store for example. Defaults to false. Source: systemd v260.1, `systemd.service(5)`. */
  readonly NonBlocking?: boolean;
  /** Controls access to the service status notification socket, as accessible via the sd_notify3 call. Takes one of none (the default), main, exec or all. If none, no daemon status updates are accepted from the service processes, all status update messages are ignored. If main, only service updates sent from the main process of the service are accepted. If exec, only service updates sent from any of the main or control processes originating from one of the Exec*= commands are accepted. If all, all services updates from all members of the service's control group are accepted. This option should be set to open access to the notification socket when using Type=notify/Type=notify-reload or WatchdogSec= (see above). If those options are used but NotifyAccess= is not configured, it will be implicitly set to main. Source: systemd v260.1, `systemd.service(5)`. */
  readonly NotifyAccess?: NotifyAccessDirectiveValue;
  /** Configure the out-of-memory (OOM) killing policy for the kernel and the userspace OOM killer systemd-oomd.service8. On Linux, when memory becomes scarce to the point that the kernel has trouble allocating memory for itself, it might decide to kill a running process in order to free up memory and reduce memory pressure. Note that systemd-oomd.service is a more flexible solution that aims to prevent out-of-memory situations for the userspace too, not just the kernel, by attempting to terminate services earlier, before the kernel would have to act. Source: systemd v260.1, `systemd.service(5)`. */
  readonly OOMPolicy?: OOMPolicyDirectiveValue;
  /** Sets the adjustment value for the Linux kernel's Out-Of-Memory (OOM) killer score for executed processes. Takes an integer between -1000 (to disable OOM killing of processes of this unit) and 1000 (to make killing of processes of this unit under memory pressure very likely). See The /proc Filesystem for details. If not specified, defaults to the OOM score adjustment level of the service manager itself, which is normally at 0. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly OOMScoreAdjust?: number;
  /** Takes an argument of the form path:fd-name:options, where: path is a path to a file or an AF_UNIX socket in the file system; fd-name is a name that will be associated with the file descriptor; the name may contain any ASCII character, but must exclude control characters and ":", and must be at most 255 characters in length; it is optional and, if not provided, defaults to the file name; options is a comma-separated list of access options; possible values are read-only, append, truncate, graceful; if not specified, files will be opened in rw mode; if graceful is specified, errors during file/socket opening are ignored. Specifying the same option several times is treated as an error. The file or socket is opened by the service manager and the file descriptor is passed to the service. If the path is a socket, we call connect() on it. See sd_listen_fds3 for more details on how to retrieve these file descriptors. Source: systemd v260.1, `systemd.service(5)`. */
  readonly OpenFile?: string;
  /** Sets the PAM service name to set up a session as. If set, the executed process will be registered as a PAM session under the specified service name. This is only useful in conjunction with the User= setting, and is otherwise ignored. If not set, no PAM session will be opened for the executed processes. See pam8 for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PAMName?: string;
  /** Takes a path referring to the PID file of the service. Usage of this option is recommended for services where Type= is set to forking. The path specified typically points to a file below /run/. If a relative path is specified for system service, then it is hence prefixed with /run/, and prefixed with $XDG_RUNTIME_DIR if specified in a user service. The service manager will read the PID of the main process of the service from this file after start-up of the service. The service manager will not write to the file configured here, although it will remove the file after the service has shut down if it still exists. The PID file does not need to be owned by a privileged user, but if it is owned by an unprivileged user additional safety restrictions are enforced: the file may not be a symlink to a file owned by a different user (neither directly nor indirectly), and the PID file must refer to a process already belonging to the service. Source: systemd v260.1, `systemd.service(5)`. */
  readonly PIDFile?: string;
  /** Pass environment variables set for the system service manager to executed processes. Takes a space-separated list of variable names. This option may be specified more than once, in which case all listed variables will be passed. If the empty string is assigned to this option, the list of environment variables to pass is reset, all prior assignments have no effect. Variables specified that are not set for the system manager will not be passed and will be silently ignored. Note that this option is only relevant for the system service manager, as system services by default do not automatically inherit any environment variables set for the service manager itself. However, in case of the user service manager all environment variables are passed to the executed processes anyway, hence this option is without effect for the user service manager. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PassEnvironment?: string | readonly string[];
  /** Controls which kernel architecture uname2 shall report, when invoked by unit processes. Takes one of the architecture identifiers arm64, arm64-be, arm, arm-be, x86, x86-64, ppc, ppc-le, ppc64, ppc64-le, s390 or s390x. Which personality architectures are supported depends on the kernel's native architecture. Usually the 64-bit versions of the various system architectures support their immediate 32-bit personality architecture counterpart, but no others. For example, x86-64 systems support the x86-64 and x86 personalities but no others. The personality feature is useful when running 32-bit services on a 64-bit host system. If not specified, the personality is left unmodified and thus reflects the personality of the host system's kernel. This option is not useful on architectures for which only one native word width was ever available, such as m68k (32-bit only) or alpha (64-bit only). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly Personality?: string;
  /** If set, mount a private instance of the BPF filesystem on /sys/fs/bpf/, effectively hiding the host bpffs which contains information about loaded programs and maps. Otherwise, if ProtectKernelTunables= is set, the instance from the host is inherited but mounted read-only. Defaults to false. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivateBPF?: boolean;
  /** If true, sets up a new /dev/ mount for the executed processes and only adds API pseudo devices such as /dev/null, /dev/zero or /dev/random (as well as the pseudo TTY subsystem) to it, but no physical devices such as /dev/sda, system memory /dev/mem, system ports /dev/port and others. This is useful to turn off physical device access by the executed process. Defaults to false. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivateDevices?: boolean;
  /** If true, sets up a new IPC namespace for the executed processes. Each IPC namespace has its own set of System V IPC identifiers and its own POSIX message queue file system. This is useful to avoid name clash of IPC identifiers. Defaults to false. It is possible to run two or more units within the same private IPC namespace by using the JoinsNamespaceOf= directive, see systemd.unit5 for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivateIPC?: boolean;
  /** Takes a boolean parameter. If set, the processes of this unit will be run in their own private file system (mount) namespace with all mount propagation from the processes towards the host's main file system namespace turned off. This means any file system mount points established or removed by the unit's processes will be private to them and not be visible to the host. However, file system mount points established or removed on the host will be propagated to the unit's processes. See mount_namespaces(7) for details on file system namespaces. Defaults to off. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivateMounts?: boolean;
  /** If true, sets up a new network namespace for the executed processes and configures only the loopback network device lo inside it. No other network devices will be available to the executed process. This is useful to turn off network access by the executed process. Defaults to false. It is possible to run two or more units within the same private network namespace by using the JoinsNamespaceOf= directive, see systemd.unit5 for details. Note that this option will disconnect all socket families from the host, including AF_NETLINK and AF_UNIX. Effectively, for AF_NETLINK this means that device configuration events received from systemd-udevd.service8 are not delivered to the unit's processes. And for AF_UNIX this has the effect that AF_UNIX sockets in the abstract socket namespace of the host will become unavailable to the unit's processes (however, those located in the file system will continue to be accessible). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivateNetwork?: boolean;
  /** Defaults to false. If enabled, sets up a new PID namespace for the executed processes. Each executed process is now PID 1 - the init process - in the new namespace. /proc/ is mounted such that only processes in the PID namespace are visible. If PrivatePIDs= is set, MountAPIVFS=yes is implied. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivatePIDs?: boolean;
  /** Supports `disconnected` in addition to booleans. Isolates `/tmp` and `/var/tmp` for this unit, and cleans up temporary files when the service stops. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivateTmp?: boolean | "disconnected";
  /** Supports `self`, `identity`, `full`, and `managed` in addition to booleans. Runs the service in a separate user namespace with a configured UID/GID mapping. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly PrivateUsers?: boolean | "self" | "identity" | "full" | "managed";
  /** Takes one of all (the default) and pid. If pid, all files and directories not directly associated with process management and introspection are made invisible in the /proc/ file system configured for the unit's processes. This controls the subset= mount option of the procfs instance for the unit. For further details see The /proc Filesystem. Note that Linux exposes various kernel APIs via /proc/, which are made unavailable with this setting. Since these APIs are used frequently this option is useful only in a few, specific cases, and is not suitable for most non-trivial programs. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProcSubset?: ProcSubsetDirectiveValue;
  /** If set, writes to the hardware clock or system clock will be denied. Defaults to off. Enabling this option removes CAP_SYS_TIME and CAP_WAKE_ALARM from the capability bounding set for this unit, installs a system call filter to block calls that can set the clock, and DeviceAllow=char-rtc r is implied. Note that the system calls are blocked altogether, the filter does not take into account that some of the calls can be used to read the clock state with some parameter combinations. Effectively, /dev/rtc0, /dev/rtc1, etc. are made read-only to the service. See systemd.resource-control5 for the details about DeviceAllow=. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectClock?: boolean;
  /** Supports `private` and `strict` in addition to booleans. Limits how the service can access `/sys/fs/cgroup`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectControlGroups?: boolean | "private" | "strict";
  /** Supports `read-only` and `tmpfs` in addition to booleans. Restricts how the service can access `/home`, `/root`, and `/run/user`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectHome?: boolean | "read-only" | "tmpfs";
  /** Supports `private` and optional `:hostname` syntax in addition to booleans. Controls whether the service gets its own UTS namespace and hostname. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectHostname?: boolean | string;
  /** If true, access to the kernel log ring buffer will be denied. It is recommended to turn this on for most services that do not need to read from or write to the kernel log ring buffer. Enabling this option removes CAP_SYSLOG from the capability bounding set for this unit, and installs a system call filter to block the syslog2 system call (not to be confused with the libc API syslog3 for userspace logging). The kernel exposes its log buffer to userspace via /dev/kmsg and /proc/kmsg. If enabled, these are made inaccessible to all the processes in the unit. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectKernelLogs?: boolean;
  /** If true, explicit module loading will be denied. This allows module load and unload operations to be turned off on modular kernels. It is recommended to turn this on for most services that do not need special file systems or extra kernel modules to work. Defaults to off. Enabling this option removes CAP_SYS_MODULE from the capability bounding set for the unit, and installs a system call filter to block module system calls, also /usr/lib/modules is made inaccessible. For this setting the same restrictions regarding mount propagation and privileges apply as for ReadOnlyPaths= and related calls, see above. Note that limited automatic module loading due to user configuration or kernel mapping tables might still happen as side effect of requested user operations, both privileged and unprivileged. To disable module auto-load feature please see sysctl.d5 kernel.modules_disabled mechanism and /proc/sys/kernel/modules_disabled documentation. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectKernelModules?: boolean;
  /** If true, kernel variables accessible through /proc/sys/, /sys/, /proc/sysrq-trigger, /proc/latency_stats, /proc/acpi, /proc/timer_stats, /proc/fs and /proc/irq will be made read-only and /proc/kallsyms as well as /proc/kcore will be inaccessible to all processes of the unit. Usually, tunable kernel variables should be initialized only at boot-time, for example with the sysctl.d5 mechanism. Few services need to write to these at runtime; it is hence recommended to turn this on for most services. For this setting the same restrictions regarding mount propagation and privileges apply as for ReadOnlyPaths= and related calls, see above. Defaults to off. Note that this option does not prevent indirect changes to kernel tunables affected by IPC calls to other processes. However, `InaccessiblePaths=` may be used to make relevant IPC file system objects inaccessible. If ProtectKernelTunables= is set, MountAPIVFS=yes is implied. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectKernelTunables?: boolean;
  /** Takes one of noaccess, invisible, ptraceable or default (which it defaults to). When set, this controls the hidepid= mount option of the procfs instance for the unit that controls which directories with process metainformation (/proc/PID) are visible and accessible: when set to noaccess the ability to access most of other users' process metadata in /proc/ is taken away for processes of the service. When set to invisible processes owned by other users are hidden from /proc/. If ptraceable all processes that cannot be ptrace()'ed by a process are hidden to it. If default no restrictions on /proc/ access or visibility are made. For further details see The /proc Filesystem. It is generally recommended to run most system services with this option set to invisible. This option is implemented via file system namespacing, and thus cannot be used with services that shall be able to install mount points in the host file system hierarchy. Note that the root user is unaffected by this option, so to be effective it has to be used together with User= or DynamicUser=yes, and also without the CAP_SYS_PTRACE capability, which also allows a process to bypass this feature. It cannot be used for services that need to access metainformation about other users' processes. This option implies MountAPIVFS=. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectProc?: ProtectProcDirectiveValue;
  /** Supports `full` and `strict` in addition to booleans. Mounts increasingly large parts of the host file system read-only for this unit. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ProtectSystem?: boolean | "full" | "strict";
  /** Paths that should be made read-only inside the unit file-system namespace. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ReadOnlyPaths?: string | readonly string[];
  /** Paths that should remain writable even when broader protections such as `ProtectSystem=` are enabled. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly ReadWritePaths?: string | readonly string[];
  /** Supports either booleans or a space-separated list of refreshable resource kinds such as `extensions` and `credentials`. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RefreshOnReload?: boolean | string;
  /** Configures the UNIX process signal to send to the service's main process when asked to reload the service's configuration. Defaults to SIGHUP. This option has no effect unless Type=notify-reload is used, see above. Source: systemd v260.1, `systemd.service(5)`. */
  readonly ReloadSignal?: NodeJS.Signals | number;
  /** Takes a boolean value that specifies whether the service shall be considered active even when all its processes exited. Defaults to no. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RemainAfterExit?: boolean;
  /** Takes a boolean parameter. If set, all System V and POSIX IPC objects owned by the user and group the processes of this unit are run as are removed when the unit is stopped. This setting only has an effect if at least one of User=, Group= and DynamicUser= are used. It has no effect on IPC objects owned by the root user. Specifically, this removes System V semaphores, as well as System V and POSIX shared memory segments and message queues. If multiple units use the same user or group the IPC objects are removed when the last of these units is stopped. This setting is implied if DynamicUser= is set. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RemoveIPC?: boolean;
  /** Configures whether the service shall be restarted when the service process exits, is killed, or a timeout is reached. The service process may be the main service process, but it may also be one of the processes specified with ExecStartPre=, ExecStartPost=, ExecStop=, ExecStopPost=, or ExecReload=. When the death of the process is a result of systemd operation (e.g. service stop or restart), the service will not be restarted. Timeouts include missing the watchdog "keep-alive ping" deadline and a service start, reload, and stop operation timeouts. Source: systemd v260.1, `systemd.service(5)`. */
  readonly Restart?: ServiceRestartDirectiveValue;
  /** Takes a list of exit status definitions that, when returned by the main service process, will force automatic service restarts, regardless of the restart setting configured with Restart=. The argument format is similar to RestartPreventExitStatus=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RestartForceExitStatus?: string | number | readonly (string | number)[];
  /** Specifies which signal to use when restarting a service. The same as KillSignal= described above, with the exception that this setting is used in a restart job. Not set by default, and the value of KillSignal= is used. Source: systemd v260.1, `systemd.kill(5)`. */
  readonly RestartKillSignal?: NodeJS.Signals | number;
  /** Configures the longest time to sleep before restarting a service as the interval goes up with RestartSteps=. Takes a value in the same format as RestartSec=, or infinity to disable the setting. Defaults to infinity. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RestartMaxDelaySec?: number | string;
  /** Takes a string value that specifies how a service should restart: If set to normal (the default), the service restarts by going through a failed/inactive state. If set to direct, the service transitions to the activating state directly during auto-restart, skipping failed/inactive state. ExecStopPost= is still invoked. OnSuccess= and OnFailure= are skipped. This option is useful in cases where a dependency can fail temporarily but we do not want these temporary failures to make the dependent units fail. Dependent units are not notified of these temporary failures. If set to debug, the service manager will log messages that are related to this unit at debug level while automated restarts are attempted, until either the service hits the rate limit or it succeeds, and the $DEBUG_INVOCATION=1 environment variable will be set for the unit. This is useful to be able to get additional information when a service fails to start, without needing to proactively or permanently enable debug level logging in systemd, which is very verbose. This is otherwise equivalent to normal mode. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RestartMode?: ServiceRestartModeDirectiveValue;
  /** Takes a list of exit status definitions that, when returned by the main service process, will prevent automatic service restarts, regardless of the restart setting configured with Restart=. Exit status definitions can be numeric termination statuses, termination status names, or termination signal names, separated by spaces. Defaults to the empty list, so that, by default, no exit status is excluded from the configured restart logic. A service with the RestartPreventExitStatus= setting RestartPreventExitStatus=TEMPFAIL 250 SIGKILL Exit status 75 (TEMPFAIL), 250, and the termination signal SIGKILL will not result in automatic service restarting. This option may appear more than once, in which case the list of restart-preventing statuses is merged. If the empty string is assigned to this option, the list is reset and all prior assignments of this option will have no effect. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RestartPreventExitStatus?: string | number | readonly (string | number)[];
  /** Configures the time to sleep before restarting a service (as configured with Restart=). Takes a unit-less value in seconds, or a time span value such as "5min 20s". Defaults to 100ms. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RestartSec?: number | string;
  /** Configures the number of exponential steps to take to increase the interval of auto-restarts from RestartSec= to RestartMaxDelaySec=. Takes a positive integer or 0 to disable it. Defaults to 0. Hint: values between 3 and 5 are good choices when exponential backoff is desired. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RestartSteps?: number;
  /** Restricts the set of socket address families accessible to the processes of this unit. Takes none, or a space-separated list of address family names to allow-list, such as AF_UNIX, AF_INET or AF_INET6, see address_families7 for all possible options. When none is specified, then all address families will be denied. When prefixed with ~ the listed address families will be applied as deny list, otherwise as allow list. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RestrictAddressFamilies?: string | readonly string[];
  /** Restricts the set of filesystems processes of this unit can open files on. Takes a space-separated list of filesystem names. Any filesystem listed is made accessible to the unit's processes, access to filesystem types not listed is prohibited (allow-listing). If the first character of the list is ~, the effect is inverted: access to the filesystems listed is prohibited (deny-listing). If the empty string is assigned, access to filesystems is not restricted. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RestrictFileSystems?: string | readonly string[];
  /** Restricts access to Linux namespace functionality for the processes of this unit. For details about Linux namespaces, see namespaces(7). Either takes a boolean argument, or a space-separated list of namespace type identifiers. If false (the default), no restrictions on namespace creation and switching are made. If true, access to any kind of namespacing is prohibited. Otherwise, a space-separated list of namespace type identifiers must be specified, consisting of any combination of: cgroup, ipc, net, mnt, pid, user, uts, and time. Any namespace type listed is made accessible to the unit's processes, access to namespace types not listed is prohibited (allow-listing). By prepending the list with a single tilde character (~) the effect may be inverted: only the listed namespace types will be made inaccessible, all unlisted ones are permitted (deny-listing). If the empty string is assigned, the default namespace restrictions are applied, which is equivalent to false. This option may appear more than once, in which case the namespace types are merged by OR, or by AND if the lines are prefixed with ~ (see examples below). Internally, this setting limits access to the unshare2, clone2 and setns2 system calls, taking the specified flags parameters into account. Note that — if this option is used — in addition to restricting creation and switching of the specified types of namespaces (or all of them, if true) access to the setns() system call with a zero flags parameter is prohibited. This setting is only supported on x86, x86-64, mips, mips-le, mips64, mips64-le, mips64-n32, mips64-le-n32, ppc64, ppc64-le, s390 and s390x, and enforces no restrictions on other architectures. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RestrictNamespaces?: boolean | string | readonly (boolean | string)[];
  /** Takes a list of space-separated network interface names. This option restricts the network interfaces that processes of this unit can use. By default, processes can only use the network interfaces listed (allow-list). If the first character of the rule is ~, the effect is inverted: the processes can only use network interfaces not listed (deny-list). Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly RestrictNetworkInterfaces?: string | readonly string[];
  /** If set, any attempts to enable realtime scheduling in a process of the unit are refused. This restricts access to realtime task scheduling policies such as SCHED_FIFO, SCHED_RR or SCHED_DEADLINE. See sched7 for details about these scheduling policies. Realtime scheduling policies may be used to monopolize CPU time for longer periods of time, and may hence be used to lock up or otherwise trigger Denial-of-Service situations on the system. It is hence recommended to restrict access to realtime scheduling to the few programs that actually require them. Defaults to off. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RestrictRealtime?: boolean;
  /** If set, any attempts to set the set-user-ID (SUID) or set-group-ID (SGID) bits on files or directories will be denied (for details on these bits see inode7). As the SUID/SGID bits are mechanisms to elevate privileges, and allow users to acquire the identity of other users, it is recommended to restrict creation of SUID/SGID files to the few programs that actually require them. Note that this restricts marking of any type of file system object with these bits, including both regular files and directories (where the SGID is a different meaning than for files, see documentation). This option is implied if DynamicUser= is enabled. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RestrictSUIDSGID?: boolean;
  /** Takes a directory path relative to the host's root directory (i.e. the root of the system running the service manager). Sets the root directory for executed processes, with the pivot_root2 or chroot2 system call. If this is used, it must be ensured that the process binary and all its auxiliary files are available in the new root. Note that setting this parameter might result in additional dependencies to be added to the unit (see above). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootDirectory?: string;
  /** If true, the root directory, as configured with the RootDirectory= option (see systemd.exec5 for more information), is only applied to the process started with ExecStart=, and not to the various other ExecStartPre=, ExecStartPost=, ExecReload=, ExecReloadPost=, ExecStop=, and ExecStopPost= commands. If false, the setting is applied to all configured commands the same way. Defaults to false. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RootDirectoryStartOnly?: boolean;
  /** If enabled, executed processes will run in an ephemeral copy of the root directory or root image. The ephemeral copy is placed in /var/lib/systemd/ephemeral-trees/ while the service is active and is cleaned up when the service is stopped or restarted. If RootDirectory= is used and the root directory is a subvolume, the ephemeral copy will be created by making a snapshot of the subvolume. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootEphemeral?: boolean;
  /** Takes a data integrity (dm-verity) root hash specified in hexadecimal, or the path to a file containing a root hash in ASCII hexadecimal format. This option enables data integrity checks using dm-verity, if the used image contains the appropriate integrity data (see above) or if RootVerity= is used. The specified hash must match the root hash of integrity data, and is usually at least 256 bits (and hence 64 formatted hexadecimal characters) long (in case of SHA256 for example). If this option is not specified, but the image file carries the user.verity.roothash extended file attribute (see xattr7), then the root hash is read from it, also as formatted hexadecimal characters. If the extended file attribute is not found (or is not supported by the underlying file system), but a file with the .roothash suffix is found next to the image file, bearing otherwise the same name (except if the image has the .raw suffix, in which case the root hash file must not have it in its name), the root hash is read from it and automatically used, also as formatted hexadecimal characters. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootHash?: string;
  /** Takes a PKCS7 signature of the RootHash= option as a path to a DER-encoded signature file, or as an ASCII base64 string encoding of a DER-encoded signature prefixed by base64:. The dm-verity volume will only be opened if the signature of the root hash is valid and signed by a public key present in the kernel keyring. If this option is not specified, but a file with the .roothash.p7s suffix is found next to the image file, bearing otherwise the same name (except if the image has the .raw suffix, in which case the signature file must not have it in its name), the signature is read from it and automatically used. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootHashSignature?: string;
  /** Takes a path to a block device node or regular file as argument. This call is similar to RootDirectory= however mounts a file system hierarchy from a block device node or loopback file instead of a directory. The device node or file system image file needs to contain a file system without a partition table, or a file system within an MBR/MS-DOS or GPT partition table with only a single Linux-compatible partition, or a set of file systems within a GPT partition table that follows the UAPI.2 Discoverable Partitions Specification. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootImage?: string;
  /** Takes a comma-separated list of mount options that will be used on disk images specified by RootImage=. Optionally a partition name can be prefixed, followed by colon, in case the image has multiple partitions, otherwise partition name root is implied. Options for multiple partitions can be specified in a single line with space separators. Assigning an empty string removes previous assignments. For a list of valid mount options, please refer to mount8. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootImageOptions?: string;
  /** Takes an image policy string as per systemd.image-policy7 to use when mounting the disk images (DDI) specified in RootImage=, MountImage=, ExtensionImage=, respectively. If not specified the following policy string is the default for RootImagePolicy= and MountImagePolicy:. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootImagePolicy?: string;
  /** Takes a path to a systemd.mstack7 directory encapsulating a mount stack consisting of layers and bind mounts. Similar to RootDirectory= and RootImage= this runs the service off a distinct root file system, in this case set up via overlayfs. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootMStack?: string;
  /** Takes the path to a data integrity (dm-verity) file. This option enables data integrity checks using dm-verity, if RootImage= is used and a root-hash is passed and if the used image itself does not contain the integrity data. The integrity data must be matched by the root hash. If this option is not specified, but a file with the .verity suffix is found next to the image file, bearing otherwise the same name (except if the image has the .raw suffix, in which case the verity data file must not have it in its name), the verity data is read from it and automatically used. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RootVerity?: string;
  /** Relative runtime-state directories to create for the service under `/run`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RuntimeDirectory?: string;
  /** File mode to apply to directories created by `RuntimeDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RuntimeDirectoryMode?: string;
  /** Supports `restart` in addition to booleans. Controls whether `RuntimeDirectory=` entries survive stops and restarts. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly RuntimeDirectoryPreserve?: boolean | "restart";
  /** Configures a maximum time for the service to run. If this is used and the service has been active for longer than the specified time it is terminated and put into a failure state. Note that this setting does not have any effect on Type=oneshot services, as they terminate immediately after activation completed (use TimeoutStartSec= to limit their activation). Pass infinity (the default) to configure no runtime limit. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RuntimeMaxSec?: number | string;
  /** This option modifies RuntimeMaxSec= by increasing the maximum runtime by an evenly distributed duration between 0 and the specified value (in seconds). If RuntimeMaxSec= is unspecified, then this feature will be disabled. Source: systemd v260.1, `systemd.service(5)`. */
  readonly RuntimeRandomizedExtraSec?: number | string;
  /** Set the SELinux security context of the executed process. If set, this will override the automated domain transition. However, the policy still needs to authorize the transition. This directive is ignored if SELinux is disabled. If prefixed by -, failing to set the SELinux security context will be ignored, but it is still possible that the subsequent execve() may fail if the policy does not allow the transition for the non-overridden context. This does not affect commands prefixed with +. See setexeccon3 for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SELinuxContext?: string;
  /** Controls the secure bits set for the executed process. Takes a space-separated combination of options from the following list: keep-caps, keep-caps-locked, no-setuid-fixup, no-setuid-fixup-locked, noroot, and noroot-locked. This option may appear more than once, in which case the secure bits are ORed. If the empty string is assigned to this option, the bits are reset to 0. This does not affect commands prefixed with +. See capabilities(7) for details. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SecureBits?: string | readonly string[];
  /** Specifies whether to send SIGHUP to remaining processes immediately after sending the signal configured with KillSignal=. This is useful to indicate to shells and shell-like programs that their connection has been severed. Takes a boolean value. Defaults to no. Source: systemd v260.1, `systemd.kill(5)`. */
  readonly SendSIGHUP?: boolean;
  /** Specifies whether to send SIGKILL (or the signal specified by FinalKillSignal=) to remaining processes after a timeout, if the normal shutdown procedure left processes of the service around. When disabled, a KillMode= of control-group or mixed service will not restart if processes from prior services exist within the control group. Takes a boolean value. Defaults to yes. Source: systemd v260.1, `systemd.kill(5)`. */
  readonly SendSIGKILL?: boolean;
  /** Similar to `LoadCredential=`, but accepts a literal value to use as data for the credential, instead of a file system path to read the data from. Do not use this option for data that is supposed to be secret, as it is accessible to unprivileged processes via IPC. It's only safe to use this for user IDs, public key material and similar non-sensitive data. For everything else use LoadCredential=. In order to embed binary data into the credential data use C-style escaping (i.e. \n to embed a newline, or \x00 to embed a NUL byte). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SetCredential?: string | readonly string[];
  /** Similar to `LoadCredential=`, but accepts a literal value to use as data for the credential, instead of a file system path to read the data from. Do not use this option for data that is supposed to be secret, as it is accessible to unprivileged processes via IPC. It's only safe to use this for user IDs, public key material and similar non-sensitive data. For everything else use LoadCredential=. In order to embed binary data into the credential data use C-style escaping (i.e. \n to embed a newline, or \x00 to embed a NUL byte). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SetCredentialEncrypted?: string | readonly string[];
  /** Takes a boolean parameter that controls whether to set the $HOME, $LOGNAME, and $SHELL environment variables. If not set, this defaults to true if User=, DynamicUser= or PAMName= are set, false otherwise. If set to true, the variables will always be set for system services, i.e. even when the default user root is used. If set to false, the mentioned variables are not set by the service manager, no matter whether User=, DynamicUser=, or PAMName= are used or not. This option normally has no effect on services of the per-user service manager, since in that case these variables are typically inherited from user manager's own environment anyway. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SetLoginEnvironment?: boolean;
  /** The name of the slice unit to place the unit in. Defaults to system.slice for all non-instantiated units of all unit types (except for slice units themselves see below). Instance units are by default placed in a subslice of system.slice that is named after the template name. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly Slice?: string;
  /** Takes a SMACK64 security label as argument. The process executed by the unit will be started under this label and SMACK will decide whether the process is allowed to run or not, based on it. The process will continue to run under the label specified here unless the executable has its own SMACK64EXEC label, in which case the process will transition to run under that label. When not specified, the label that systemd is running under is used. This directive is ignored if SMACK is disabled. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SmackProcessLabel?: string;
  /** Configures restrictions on the ability of unit processes to invoke bind2 on a socket. Both allow and deny rules to be defined that restrict which addresses a socket may be bound to. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly SocketBindAllow?: string | readonly string[];
  /** See systemd.service(5) for SocketBindDeny=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly SocketBindDeny?: string | readonly string[];
  /** Specifies the name of the socket units this service shall inherit socket file descriptors from when the service is started. Normally, it should not be necessary to use this setting, as all socket file descriptors whose unit shares the same name as the service (subject to the different unit name suffix of course) are passed to the spawned process. Source: systemd v260.1, `systemd.service(5)`. */
  readonly Sockets?: string | readonly string[];
  /** Controls where file descriptor 2 (stderr) of the executed processes is connected to. The available options are identical to those of StandardOutput=, with some exceptions: if set to inherit the file descriptor used for standard output is duplicated for standard error, while fd:name will use a default file descriptor name of stderr. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StandardError?: StandardErrorDirectiveValue;
  /** Controls where file descriptor 0 (STDIN) of the executed processes is connected to. Takes one of null, tty, tty-force, tty-fail, data, file:path, socket or fd:name. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StandardInput?: StandardInputDirectiveValue;
  /** Configures arbitrary textual or binary data to pass via file descriptor 0 (STDIN) to the executed processes. These settings have no effect unless StandardInput= is set to data (which is the default if StandardInput= is not set otherwise, but StandardInputText=/StandardInputData= is). Use this option to embed process input data directly in the unit file. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StandardInputData?: string | readonly string[];
  /** Configures arbitrary textual or binary data to pass via file descriptor 0 (STDIN) to the executed processes. These settings have no effect unless StandardInput= is set to data (which is the default if StandardInput= is not set otherwise, but StandardInputText=/StandardInputData= is). Use this option to embed process input data directly in the unit file. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StandardInputText?: string | readonly string[];
  /** Controls where file descriptor 1 (stdout) of the executed processes is connected to. Takes one of inherit, null, tty, journal, kmsg, journal+console, kmsg+console, file:path, append:path, truncate:path, socket or fd:name. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StandardOutput?: StandardOutputDirectiveValue;
  /** This setting controls the cpuset controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly StartupAllowedCPUs?: string;
  /** These settings control the cpuset controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly StartupAllowedMemoryNodes?: string;
  /** See systemd.service(5) for StartupCPUWeight=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly StartupCPUWeight?: number | string;
  /** See systemd.service(5) for StartupIOWeight=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly StartupIOWeight?: number | string;
  /** See systemd.service(5) for StartupMemoryHigh=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly StartupMemoryHigh?: number | string;
  /** See systemd.service(5) for StartupMemoryLow=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly StartupMemoryLow?: number | string;
  /** See systemd.service(5) for StartupMemoryMax=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly StartupMemoryMax?: number | string;
  /** See systemd.service(5) for StartupMemorySwapMax=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly StartupMemorySwapMax?: number | string;
  /** See systemd.service(5) for StartupMemoryZSwapMax=. Source: systemd v260.1, `systemd.service(5)`. */
  readonly StartupMemoryZSwapMax?: number | string;
  /** Relative persistent-state directories to create for the service under `/var/lib`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StateDirectory?: string;
  /** Enables project-quota accounting for directories created by `StateDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StateDirectoryAccounting?: boolean;
  /** File mode to apply to directories created by `StateDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StateDirectoryMode?: string;
  /** Storage quota for directories created by `StateDirectory=`. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly StateDirectoryQuota?: number | string;
  /** Takes a list of exit status definitions that, when returned by the main service process, will be considered successful termination, in addition to the normal successful exit status 0 and, except for Type=oneshot, the signals SIGHUP, SIGINT, SIGTERM, and SIGPIPE. Exit status definitions can be numeric termination statuses, termination status names, or termination signal names, separated by spaces. See the Process Exit Codes section in systemd.exec5 for a list of termination status names (for this setting only the part without the EXIT_ or EX_ prefix should be used). See signal(7) for a list of signal names. Source: systemd v260.1, `systemd.service(5)`. */
  readonly SuccessExitStatus?: string | number | readonly (string | number)[];
  /** Sets the supplementary Unix groups the processes are executed as. This takes a space-separated list of group names or IDs. This option may be specified more than once, in which case all listed groups are set as supplementary groups. When the empty string is assigned, the list of supplementary groups is reset, and all assignments prior to this one will have no effect. In any way, this option does not override, but extends the list of supplementary groups configured in the system group database for the user. This does not affect commands prefixed with +. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SupplementaryGroups?: string | readonly string[];
  /** Sets the syslog facility identifier to use when logging. One of kern, user, mail, daemon, auth, syslog, lpr, news, uucp, cron, authpriv, ftp, local0, local1, local2, local3, local4, local5, local6 or local7. See syslog3 for details. This option is only useful when StandardOutput= or StandardError= are set to journal or kmsg (or to the same settings in combination with +console), and only applies to log messages written to stdout or stderr. Defaults to daemon. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SyslogFacility?: SyslogFacilityDirectiveValue;
  /** Sets the process name ("syslog tag") to prefix log lines sent to the logging system or the kernel log buffer with. If not set, defaults to the process name of the executed process. This option is only useful when StandardOutput= or StandardError= are set to journal or kmsg (or to the same settings in combination with +console) and only applies to log messages written to stdout or stderr. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SyslogIdentifier?: string;
  /** The default syslog log level to use when logging to the logging system or the kernel log buffer. One of emerg, alert, crit, err, warning, notice, info, debug. See syslog3 for details. This option is only useful when StandardOutput= or StandardError= are set to journal or kmsg (or to the same settings in combination with +console), and only applies to log messages written to stdout or stderr. Note that individual lines output by executed processes may be prefixed with a different log level which can be used to override the default log level specified here. The interpretation of these prefixes may be disabled with SyslogLevelPrefix=, see below. For details, see sd-daemon3. Defaults to info. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SyslogLevel?: SyslogLevelDirectiveValue;
  /** If true and StandardOutput= or StandardError= are set to journal or kmsg (or to the same settings in combination with +console), log lines written by the executed process that are prefixed with a log level will be processed with this log level set but the prefix removed. If set to false, the interpretation of these prefixes is disabled and the logged lines are passed on as-is. This only applies to log messages written to stdout or stderr. For details about this prefixing see sd-daemon3. Defaults to true. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SyslogLevelPrefix?: boolean;
  /** Takes a space-separated list of architecture identifiers to include in the system call filter. The known architecture identifiers are the same as for ConditionArchitecture= described in systemd.unit5, as well as x32, mips64-n32, mips64-le-n32, and the special identifier native. The special identifier native implicitly maps to the native architecture of the system (or more precisely: to the architecture the system manager is compiled for). By default, this option is set to the empty list, i.e. no filtering is applied. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SystemCallArchitectures?: string | readonly string[];
  /** Takes an errno error number (between 1 and 4095) or errno name such as EPERM, EACCES or EUCLEAN, to return when the system call filter configured with SystemCallFilter= is triggered, instead of terminating the process immediately. See errno3 for a full list of error codes. When this setting is not used, or when the empty string or the special setting kill is assigned, the process will be terminated immediately when the filter is triggered. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SystemCallErrorNumber?: string;
  /** Takes a space-separated list of system call names or system call groups. If this setting is used, system calls executed by the unit processes except for the listed ones will result in the system call being denied (allow-listing). If the first character of the list is ~, the effect is inverted: only the listed system calls will be denied (deny-listing). This option may be specified more than once, in which case the filter masks are merged. If the empty string is assigned, the filter is reset, all prior assignments will have no effect. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SystemCallFilter?: string | readonly string[];
  /** Takes a space-separated list of system call names. If this setting is used, all system calls executed by the unit processes for the listed ones will be logged. If the first character of the list is ~, the effect is inverted: all system calls except the listed system calls will be logged. This feature makes use of the Secure Computing Mode 2 interfaces of the kernel ('seccomp filtering') and is useful for auditing or setting up a minimal sandboxing environment. This option may be specified more than once, in which case the filter masks are merged. If the empty string is assigned, the filter is reset, all prior assignments will have no effect. This does not affect commands prefixed with +. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly SystemCallLog?: string | readonly string[];
  /** Configure the size of the TTY specified with TTYPath=. If unset or set to the empty string, it is attempted to retrieve the dimensions of the terminal screen via ANSI sequences, and if that fails the kernel defaults (typically 80x24) are used. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TTYColumns?: number;
  /** Sets the terminal device node to use if standard input, output, or error are connected to a TTY (see above). Defaults to /dev/console. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TTYPath?: string;
  /** Reset the terminal device specified with TTYPath= before and after execution. This does not erase the screen (see TTYVTDisallocate= below for that). Defaults to no. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TTYReset?: boolean;
  /** Configure the size of the TTY specified with TTYPath=. If unset or set to the empty string, it is attempted to retrieve the dimensions of the terminal screen via ANSI sequences, and if that fails the kernel defaults (typically 80x24) are used. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TTYRows?: number;
  /** Disconnect all clients which have opened the terminal device specified with TTYPath= before and after execution. Defaults to no. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TTYVHangup?: boolean;
  /** If the terminal device specified with TTYPath= is a virtual console terminal, try to deallocate the TTY before and after execution. This ensures that the screen and scrollback buffer is cleared. If the terminal device is of any other type of TTY an attempt is made to clear the screen via ANSI sequences. Defaults to no. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TTYVTDisallocate?: boolean;
  /** This setting controls the pids controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly TasksAccounting?: boolean;
  /** This setting controls the pids controller in the unified hierarchy. Source: systemd v260.1, `systemd.resource-control(5)`. */
  readonly TasksMax?: number | string;
  /** Takes a space-separated list of mount points for temporary file systems (tmpfs). If set, a new file system namespace is set up for executed processes, and a temporary file system is mounted on each mount point. This option may be specified more than once, in which case temporary file systems are mounted on all listed mount points. If the empty string is assigned to this option, the list is reset, and all prior assignments have no effect. Each mount point may optionally be suffixed with a colon (:) and mount options such as size=10% or ro. By default, each temporary file system is mounted with nodev,strictatime,mode=0755. These can be disabled by explicitly specifying the corresponding mount options, e.g., dev or nostrictatime. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TemporaryFileSystem?: string | readonly string[];
  /** This option configures the time to wait for the service to terminate when it was aborted due to a watchdog timeout (see WatchdogSec=). If the service has a short TimeoutStopSec= this option can be used to give the system more time to write a core dump of the service. Upon expiration the service will be forcibly terminated by SIGKILL (see KillMode= in systemd.kill5). The core file will be truncated in this case. Use TimeoutAbortSec= to set a sensible timeout for the core dumping per service that is large enough to write all expected data while also being short enough to handle the service failure in due time. Source: systemd v260.1, `systemd.service(5)`. */
  readonly TimeoutAbortSec?: number | string;
  /** A shorthand for configuring both TimeoutStartSec= and TimeoutStopSec= to the specified value. Source: systemd v260.1, `systemd.service(5)`. */
  readonly TimeoutSec?: number | string;
  /** Configures a timeout on the clean-up operation requested through systemctl clean …, see systemctl1 for details. Takes the usual time values and defaults to infinity, i.e. by default no timeout is applied. If a timeout is configured the clean operation will be aborted forcibly when the timeout is reached, potentially leaving resources on disk. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TimeoutCleanSec?: number | string;
  /** These options configure the action that is taken in case a daemon service does not signal start-up within its configured TimeoutStartSec=, respectively if it does not stop within TimeoutStopSec=. Takes one of terminate, abort and kill. Both options default to terminate. Source: systemd v260.1, `systemd.service(5)`. */
  readonly TimeoutStartFailureMode?: TimeoutFailureModeDirectiveValue;
  /** Configures the time to wait for start-up. If a daemon service does not signal start-up completion within the configured time, the service will be considered failed and will be shut down again. The precise action depends on the TimeoutStartFailureMode= option. Takes a unit-less value in seconds, or a time span value such as "5min 20s". Pass infinity to disable the timeout logic. Defaults to DefaultTimeoutStartSec= set in the manager, except when Type=oneshot is used, in which case the timeout is disabled by default (see systemd-system.conf(5)). Source: systemd v260.1, `systemd.service(5)`. */
  readonly TimeoutStartSec?: number | string;
  /** These options configure the action that is taken in case a daemon service does not signal start-up within its configured TimeoutStartSec=, respectively if it does not stop within TimeoutStopSec=. Takes one of terminate, abort and kill. Both options default to terminate. Source: systemd v260.1, `systemd.service(5)`. */
  readonly TimeoutStopFailureMode?: TimeoutFailureModeDirectiveValue;
  /** This option serves two purposes. First, it configures the time to wait for each ExecStop= command. If any of them times out, subsequent ExecStop= commands are skipped and the service will be terminated by SIGTERM. If no ExecStop= commands are specified, the service gets the SIGTERM immediately. This default behavior can be changed by the TimeoutStopFailureMode= option. Second, it configures the time to wait for the service itself to stop. If it does not terminate in the specified time, it will be forcibly terminated by SIGKILL (see KillMode= in systemd.kill5). Takes a unit-less value in seconds, or a time span value such as "5min 20s". Pass infinity to disable the timeout logic. Defaults to DefaultTimeoutStopSec= from the manager configuration file (see systemd-system.conf(5)). Source: systemd v260.1, `systemd.service(5)`. */
  readonly TimeoutStopSec?: number | string;
  /** Sets the timer slack in nanoseconds for the executed processes. The timer slack controls the accuracy of wake-ups triggered by timers. See prctl(2) for more information. Note that in contrast to most other time span definitions this parameter takes an integer value in nano-seconds if no unit is specified. The usual time units are understood too. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly TimerSlackNSec?: number | string;
  /** Controls the file mode creation mask. Takes an access mode in octal notation. See umask2 for details. Defaults to 0022 for system units. For user units the default value is inherited from the per-user service manager (whose default is in turn inherited from the system service manager, and thus typically also is 0022 — unless overridden by a PAM module). In order to change the per-user mask for all user services, consider setting the UMask= setting of the user's user@.service system service instance. The per-user umask may also be set via the umask field of a user's JSON User Record (for users managed by systemd-homed.service8 this field may be controlled via homectl --umask=). It may also be set via a PAM module, such as pam_umask8. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly UMask?: string;
  /** Configure the location of a file containing USB FunctionFS descriptors, for implementation of USB gadget functions. This is used only in conjunction with a socket unit with ListenUSBFunction= configured. The contents of this file are written to the ep0 file after it is opened. Source: systemd v260.1, `systemd.service(5)`. */
  readonly USBFunctionDescriptors?: string;
  /** Configure the location of a file containing USB FunctionFS strings. Behavior is similar to USBFunctionDescriptors= above. Source: systemd v260.1, `systemd.service(5)`. */
  readonly USBFunctionStrings?: string;
  /** Explicitly unset environment variable assignments that would normally be passed from the service manager to invoked processes of this unit. Takes a space-separated list of variable names or variable assignments. This option may be specified more than once, in which case all listed variables/assignments will be unset. If the empty string is assigned to this option, the list of environment variables/assignments to unset is reset. If a variable assignment is specified (that is: a variable name, followed by =, followed by its value), then any environment variable matching this precise assignment is removed. If a variable name is specified (that is a variable name without any following = or value), then any assignment matching the variable name, regardless of its value is removed. Note that the effect of UnsetEnvironment= is applied as final step when the environment list passed to executed processes is compiled. That means it may undo assignments from any configuration source, including assignments made through Environment= or EnvironmentFile=, inherited from the system manager's global set of environment variables, inherited via PassEnvironment=, set by the service manager itself (such as $NOTIFY_SOCKET and such), or set by a PAM module (in case PAMName= is used). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly UnsetEnvironment?: string | readonly string[];
  /** Set the UNIX user or group that the processes are executed as, respectively. Takes a single user or group name, or a numeric ID as argument. For system services (services run by the system service manager, i.e. managed by PID 1) and for user services of the root user (services managed by root's instance of systemd --user), the default is root, but this directive may be used to specify a different identity. For user services of any other user, switching user identity is not permitted, hence the only valid setting is the same user the user's service manager is running as. If no group is set, the default group of the user is used. This setting does not affect commands whose command line is prefixed with +. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly User?: string;
  /** Takes an absolute file system path referring to a Linux user namespace pseudo-file (i.e. a file like /proc/$PID/ns/user or a bind mount or symlink to one). When set the invoked processes are added to the user namespace referenced by that path. The path has to point to a valid namespace file at the moment the processes are forked off. If this option is used PrivateUsers= has no effect. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly UserNamespacePath?: string;
  /** Takes a four character identifier string for an utmp5 and wtmp entry for this service. This should only be set for services such as getty implementations (such as agetty8) where utmp/wtmp entries must be created and cleared before and after execution, or for services that shall be executed as if they were run by a getty process (see below). If the configured string is longer than four characters, it is truncated and the terminal four characters are used. This setting interprets %I style string replacements. This setting is unset by default, i.e. no utmp/wtmp entries are created or cleaned up for this service. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly UtmpIdentifier?: string;
  /** Takes one of init, login or user. If UtmpIdentifier= is set, controls which type of utmp5/wtmp entries for this service are generated. This setting has no effect unless UtmpIdentifier= is set too. If init is set, only an INIT_PROCESS entry is generated and the invoked process must implement a getty-compatible utmp/wtmp logic. If login is set, first an INIT_PROCESS entry, followed by a LOGIN_PROCESS entry is generated. In this case, the invoked process must implement a login1-compatible utmp/wtmp logic. If user is set, first an INIT_PROCESS entry, then a LOGIN_PROCESS entry and finally a USER_PROCESS entry is generated. In this case, the invoked process may be any process that is suitable to be run as session leader. Defaults to init. Source: systemd v260.1, `systemd.exec(5)`. */
  readonly UtmpMode?: UtmpModeDirectiveValue;
  /** Configures the mechanism via which the service notifies the manager that the service start-up has finished. One of simple, exec, forking, oneshot, dbus, notify, notify-reload, or idle:. Source: systemd v260.1, `systemd.service(5)`. */
  readonly Type?: ServiceTypeDirectiveValue;
  /** Configures the watchdog timeout for a service. The watchdog is activated when the start-up is completed. The service must call sd_notify3 regularly with WATCHDOG=1 (i.e. the "keep-alive ping"). If the time between two such calls is larger than the configured time, then the service is placed in a failed state and it will be terminated with SIGABRT (or the signal specified by WatchdogSignal=). By setting Restart= to on-failure, on-watchdog, on-abnormal or always, the service will be automatically restarted. The time configured here will be passed to the executed service process in the WATCHDOG_USEC= environment variable. This allows daemons to automatically enable the keep-alive pinging logic if watchdog support is enabled for the service. If this option is used, NotifyAccess= (see below) should be set to open access to the notification socket provided by systemd. If NotifyAccess= is not set, it will be implicitly set to main. Defaults to 0, which disables this feature. The service can check whether the service manager expects watchdog keep-alive notifications. See sd_watchdog_enabled3 for details. sd_event_set_watchdog3 may be used to enable automatic watchdog notification support. Source: systemd v260.1, `systemd.service(5)`. */
  readonly WatchdogSec?: number | string;
  /** Specifies which signal to use to terminate the service when the watchdog timeout expires (enabled through WatchdogSec=). Defaults to SIGABRT. Source: systemd v260.1, `systemd.kill(5)`. */
  readonly WatchdogSignal?: NodeJS.Signals | number;
  /** Takes a directory path relative to the service's root directory specified by RootDirectory=, or the special value ~. Sets the working directory for executed processes. If set to ~, the home directory of the user specified in User= is used. If not set, defaults to the root directory when systemd is running as a system instance and the respective user's home directory if run as user. If the setting is prefixed with the - character, a missing working directory is not considered fatal. If RootDirectory=/RootImage= is not set, then WorkingDirectory= is relative to the root of the system running the service manager. Note that setting this parameter might result in additional dependencies to be added to the unit (see above). Source: systemd v260.1, `systemd.exec(5)`. */
  readonly WorkingDirectory?: string;
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
