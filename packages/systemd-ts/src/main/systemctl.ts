import { defaultCommandExecutor, parseStartStatus } from "./internal.ts";
import type {
  CommandExecutor,
  CommandOutput,
  StartStatus,
  SystemctlEnablementState,
  SystemctlIsEnabledOptions,
  SystemctlListTimersOptions,
  SystemctlOptions,
  SystemctlStateQueryOptions,
  SystemctlShowOptions,
  SystemctlStatusOptions,
  SystemctlTimerListEntry,
} from "./types.ts";

/**
 * A TypeScript-first client for invoking `systemctl` with structured argument
 * vectors instead of shell-composed command strings.
 *
 * This lower-level primitive is useful both on its own and as the subprocess
 * transport underneath higher-level abstractions such as {@link Systemd}.
 */
export class Systemctl {
  /** Command executor used for `systemctl` subprocesses. */
  public readonly executor: CommandExecutor;
  /** The target manager scope, either `system` or `user`. */
  public readonly scope: `system` | `user`;

  public constructor(options: SystemctlOptions = {}) {
    this.scope = options.scope ?? `system`;
    this.executor = options.executor ?? defaultCommandExecutor;
    Object.freeze(this);
  }

  /** Reloads the targeted systemd manager. */
  public async daemonReload(): Promise<CommandOutput> {
    return this.run(`daemon-reload`);
  }

  /** Enables a unit by filename. */
  public async enable(unit: string): Promise<CommandOutput> {
    return this.run(`enable`, unit);
  }

  /** Links a unit file path into the targeted manager. */
  public async link(path: string): Promise<CommandOutput> {
    return this.run(`link`, path);
  }

  /**
   * Checks the install-time enablement state of a unit file.
   *
   * Source:
   * - systemd v260.1, `systemctl(1)`
   */
  public async isEnabled(
    unit: string,
    options: SystemctlIsEnabledOptions = {},
  ): Promise<SystemctlEnablementState> {
    const output = await this.run(
      `is-enabled`,
      ...(options.full ? [`--full`] : []),
      ...(options.quiet ? [`--quiet`] : []),
      unit,
    );
    return firstNonEmptyOutputLine(output) as SystemctlEnablementState;
  }

  /**
   * Checks the runtime active state of a unit.
   *
   * Unless `quiet` is set, this returns the state string printed by
   * `systemctl is-active`.
   */
  public async isActive(unit: string, options: SystemctlStateQueryOptions = {}): Promise<string> {
    const output = await this.run(`is-active`, ...(options.quiet ? [`--quiet`] : []), unit);
    return firstNonEmptyOutputLine(output);
  }

  /**
   * Checks whether a unit is in the failed state.
   *
   * Unless `quiet` is set, this returns the state string printed by
   * `systemctl is-failed`.
   */
  public async isFailed(unit: string, options: SystemctlStateQueryOptions = {}): Promise<string> {
    const output = await this.run(`is-failed`, ...(options.quiet ? [`--quiet`] : []), unit);
    return firstNonEmptyOutputLine(output);
  }

  /**
   * Queries `systemctl show` for a unit.
   *
   * When `properties` are provided, only those properties are requested.
   */
  public async show(unit: string, options: SystemctlShowOptions = {}): Promise<CommandOutput> {
    const propertyFlag =
      options.properties === undefined || options.properties.length === 0
        ? []
        : [`--property=${options.properties.join(`,`)}`];
    return this.run(`show`, unit, ...propertyFlag);
  }

  /**
   * Queries `systemctl show` and parses the result into a key-value object.
   *
   * Properties are returned exactly as printed by `systemctl show`.
   */
  public async showProperties(
    unit: string,
    options: SystemctlShowOptions = {},
  ): Promise<Readonly<Record<string, string>>> {
    const output = await this.show(unit, options);
    return parseSystemctlShowOutput(output.stdout);
  }

  /**
   * Queries the standard status-related `show` properties for a unit and
   * returns a parsed snapshot.
   */
  public async showStatus(unit: string): Promise<StartStatus> {
    const output = await this.show(unit, {
      properties: [`Id`, `ActiveState`, `SubState`, `Result`, `ExecMainStatus`],
    });
    return parseStartStatus(unit, output.stdout);
  }

  /**
   * Queries `systemctl list-timers` and returns the observed JSON payload
   * shape directly, with raw integer timestamps left intact.
   */
  public async listTimers(
    options: SystemctlListTimersOptions = {},
  ): Promise<readonly SystemctlTimerListEntry[]> {
    const output = await this.run(
      `list-timers`,
      ...(options.all ? [`--all`] : []),
      ...((options.noPager ?? true) ? [`--no-pager`] : []),
      `--output=json`,
      ...(options.patterns ?? []),
    );
    return JSON.parse(output.stdout) as readonly SystemctlTimerListEntry[];
  }

  /** Starts a unit by filename. */
  public async start(unit: string): Promise<CommandOutput> {
    return this.run(`start`, unit);
  }

  /**
   * Queries `systemctl status` for a unit.
   *
   * This is primarily a human-oriented command and is best paired with
   * `show()` when structured state is needed.
   */
  public async status(unit: string, options: SystemctlStatusOptions = {}): Promise<CommandOutput> {
    const args = [`status`, unit] as string[];
    if (options.noPager ?? true) {
      args.push(`--no-pager`);
    }
    if (options.lines !== undefined) {
      args.push(`--lines`, String(options.lines));
    }

    return this.run(...args);
  }

  /** Executes a raw `systemctl` invocation with scope-aware arguments. */
  public async run(...args: readonly string[]): Promise<CommandOutput> {
    return this.executor(`systemctl`, [...this.scopeArgs(), ...args]);
  }

  private scopeArgs(): readonly string[] {
    return this.scope === `user` ? [`--user`] : [];
  }
}

function parseSystemctlShowOutput(output: string): Readonly<Record<string, string>> {
  return Object.freeze(
    Object.fromEntries(
      output
        .split(`\n`)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const separatorIndex = line.indexOf(`=`);
          if (separatorIndex === -1) {
            return [line, ``] as const;
          }

          return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)] as const;
        }),
    ),
  );
}

function firstNonEmptyOutputLine(output: CommandOutput): string {
  const line = [output.stdout, output.stderr]
    .flatMap((value) => value.split(`\n`))
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  return line ?? ``;
}
