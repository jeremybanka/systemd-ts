import { defaultCommandExecutor, parseStartStatus } from "./internal.ts";
import { SystemctlCommandError } from "./errors.ts";
import type { Result } from "./internal.ts";
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
  public async daemonReload(): Promise<Result<CommandOutput, SystemctlCommandError>> {
    return this.run(`daemon-reload`);
  }

  /** Enables a unit by filename. */
  public async enable(unit: string): Promise<Result<CommandOutput, SystemctlCommandError>> {
    return this.run(`enable`, unit);
  }

  /** Links a unit file path into the targeted manager. */
  public async link(path: string): Promise<Result<CommandOutput, SystemctlCommandError>> {
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
  ): Promise<Result<SystemctlEnablementState, SystemctlCommandError>> {
    const output = await this.run(
      `is-enabled`,
      ...(options.full ? [`--full`] : []),
      ...(options.quiet ? [`--quiet`] : []),
      unit,
    );
    if (!output.ok) {
      return output;
    }
    return ok(firstNonEmptyOutputLine(output.value) as SystemctlEnablementState);
  }

  /**
   * Checks the runtime active state of a unit.
   *
   * Unless `quiet` is set, this returns the state string printed by
   * `systemctl is-active`.
   */
  public async isActive(
    unit: string,
    options: SystemctlStateQueryOptions = {},
  ): Promise<Result<string, SystemctlCommandError>> {
    const output = await this.run(`is-active`, ...(options.quiet ? [`--quiet`] : []), unit);
    if (!output.ok) {
      return output;
    }
    return ok(firstNonEmptyOutputLine(output.value));
  }

  /**
   * Checks whether a unit is in the failed state.
   *
   * Unless `quiet` is set, this returns the state string printed by
   * `systemctl is-failed`.
   */
  public async isFailed(
    unit: string,
    options: SystemctlStateQueryOptions = {},
  ): Promise<Result<string, SystemctlCommandError>> {
    const output = await this.run(`is-failed`, ...(options.quiet ? [`--quiet`] : []), unit);
    if (!output.ok) {
      return output;
    }
    return ok(firstNonEmptyOutputLine(output.value));
  }

  /**
   * Queries `systemctl show` for a unit.
   *
   * When `properties` are provided, only those properties are requested.
   */
  public async show(
    unit: string,
    options: SystemctlShowOptions = {},
  ): Promise<Result<CommandOutput, SystemctlCommandError>> {
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
  ): Promise<Result<Readonly<Record<string, string>>, SystemctlCommandError>> {
    const output = await this.show(unit, options);
    if (!output.ok) {
      return output;
    }
    return ok(parseSystemctlShowOutput(output.value.stdout));
  }

  /**
   * Queries the standard status-related `show` properties for a unit and
   * returns a parsed snapshot.
   */
  public async showStatus(unit: string): Promise<Result<StartStatus, SystemctlCommandError>> {
    const output = await this.show(unit, {
      properties: [`Id`, `ActiveState`, `SubState`, `Result`, `ExecMainStatus`],
    });
    if (!output.ok) {
      return output;
    }
    return ok(parseStartStatus(unit, output.value.stdout));
  }

  /**
   * Queries `systemctl list-timers` and returns the observed JSON payload
   * shape directly, with raw integer timestamps left intact.
   */
  public async listTimers(
    options: SystemctlListTimersOptions = {},
  ): Promise<Result<readonly SystemctlTimerListEntry[], SystemctlCommandError>> {
    const args = [
      `list-timers`,
      ...(options.all ? [`--all`] : []),
      ...((options.noPager ?? true) ? [`--no-pager`] : []),
      `--output=json`,
      ...(options.patterns ?? []),
    ] as const;
    const output = await this.run(...args);
    if (!output.ok) {
      return output;
    }
    try {
      return ok(JSON.parse(output.value.stdout) as readonly SystemctlTimerListEntry[]);
    } catch (cause) {
      return err(
        new SystemctlCommandError(`Failed to parse JSON output from systemctl list-timers`, {
          args: [...this.scopeArgs(), ...args],
          cause,
          command: `systemctl`,
          operation: `list-timers`,
          reason: `invalid-json`,
        }),
      );
    }
  }

  /** Starts a unit by filename. */
  public async start(unit: string): Promise<Result<CommandOutput, SystemctlCommandError>> {
    return this.run(`start`, unit);
  }

  /**
   * Queries `systemctl status` for a unit.
   *
   * This is primarily a human-oriented command and is best paired with
   * `show()` when structured state is needed.
   */
  public async status(
    unit: string,
    options: SystemctlStatusOptions = {},
  ): Promise<Result<CommandOutput, SystemctlCommandError>> {
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
  public async run(
    ...args: readonly string[]
  ): Promise<Result<CommandOutput, SystemctlCommandError>> {
    const scopedArgs = [...this.scopeArgs(), ...args];
    try {
      return ok(await this.executor(`systemctl`, scopedArgs));
    } catch (cause) {
      return err(
        new SystemctlCommandError(`Failed to run systemctl ${args[0] ?? `command`}`, {
          args: scopedArgs,
          cause,
          command: `systemctl`,
          operation: args[0],
          reason: `executor-failed`,
        }),
      );
    }
  }

  private scopeArgs(): readonly string[] {
    return this.scope === `user` ? [`--user`] : [];
  }
}

function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
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
