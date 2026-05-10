import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  defaultCommandExecutor,
  defaultUnitDirForScope,
  fileExists,
  parseStartStatus,
  shellQuote,
  type Result,
} from "./internal.ts";
import {
  NoUnitsProvidedError,
  InvalidExecDirectiveError,
  UnitEnableError,
  UnitLogsReadError,
  UnitMaterializationError,
  UnitStartError,
} from "./errors.ts";
import { SystemdService } from "./systemd-service.ts";
import { SystemdTimer } from "./systemd-timer.ts";
import type {
  CommandExecutor,
  MaterializedUnit,
  LogsOptions,
  StartStatus,
  SystemdOptions,
  SystemdUnit,
  ValidInstallUnits,
} from "./types.ts";

/**
 * A successful systemd unit materialization.
 *
 * It records the target directory and the on-disk path associated with each
 * materialized unit.
 */
export class SystemdMaterialization<
  TUnits extends readonly SystemdUnit[] = readonly SystemdUnit[],
> {
  /** The directory units were written into. */
  public readonly directory: string;
  /** The materialized units together with their resolved on-disk paths. */
  public readonly materialized: readonly MaterializedUnit<TUnits[number]>[];

  public constructor(directory: string, materialized: readonly MaterializedUnit<TUnits[number]>[]) {
    this.directory = directory;
    this.materialized = Object.freeze([...materialized]);
    Object.freeze(this);
  }
}

/**
 * A configured interface to a specific systemd environment.
 *
 * `Systemd` combines unit-file materialization with a command execution
 * strategy. It knows which scope it is targeting, where unit files should be
 * written, and how `systemctl` should be invoked.
 *
 * This abstraction is intentionally close to `systemctl` concepts while still
 * accepting full unit definitions instead of loose unit-name strings.
 */
export class Systemd {
  /** Command executor used for `systemctl` and related subprocess calls. */
  public readonly executor: CommandExecutor;
  /** Whether units should be linked into systemd before manager operations. */
  public readonly linkUnits: boolean;
  /** The target manager scope, either `system` or `user`. */
  public readonly scope: `system` | `user`;
  /** The directory used when materializing unit files. */
  public readonly unitDir: string;

  /**
   * Creates a configured `Systemd` facade.
   *
   * By default, this targets the system scope and `/etc/systemd/system`. Use
   * `scope: "user"` or an explicit `unitDir` to target a different manager or
   * unit-file location.
   */
  public constructor(options: SystemdOptions = {}) {
    this.scope = options.scope ?? `system`;
    this.unitDir = options.unitDir ?? defaultUnitDirForScope(this.scope);
    this.linkUnits = options.linkUnits ?? false;
    this.executor = options.executor ?? defaultCommandExecutor;
    Object.freeze(this);
  }

  /**
   * Renders and writes one or more units into this instance's `unitDir`.
   *
   * This is intentionally a file-materialization step. It does not enable or
   * start the units on its own.
   */
  public async materialize<const TUnits extends readonly SystemdUnit[]>(
    ...units: TUnits & ValidInstallUnits<TUnits>
  ): Promise<
    Result<
      SystemdMaterialization<TUnits>,
      InvalidExecDirectiveError | NoUnitsProvidedError | UnitMaterializationError
    >
  > {
    return this.materializeUnits(units);
  }

  /**
   * Enables one or more units via `systemctl enable`.
   *
   * When `linkUnits` is enabled, this first links materialized unit files into the
   * target manager and reloads systemd so the units are visible before the
   * enable operation runs.
   */
  public async enable(
    ...units: readonly SystemdUnit[]
  ): Promise<Result<void, NoUnitsProvidedError | UnitEnableError>> {
    if (units.length === 0) {
      return err(new NoUnitsProvidedError(`Systemd.enable()`));
    }

    const scopeArgs = this.scopeArgs();
    try {
      await this.prepareUnits(scopeArgs, units, `enable`);
    } catch (cause) {
      if (cause instanceof UnitEnableError) {
        return err(cause);
      }

      return err(
        new UnitEnableError(`Failed to prepare units for enable`, {
          cause,
          stage: `prepare`,
          unitName: units[0]?.filename,
        }),
      );
    }

    for (const unit of units) {
      const args = [...scopeArgs, `enable`, unit.filename] as const;
      try {
        await this.executor(`systemctl`, args);
      } catch (cause) {
        return err(
          new UnitEnableError(`Failed to enable ${unit.filename}`, {
            args,
            cause,
            command: `systemctl`,
            stage: `enable`,
            unitName: unit.filename,
          }),
        );
      }
    }

    return ok(undefined);
  }

  /**
   * Starts a unit and returns a parsed `systemctl show` snapshot of its final
   * observed state.
   *
   * For oneshot services, a successful result commonly means `ActiveState` is
   * already back to `inactive` by the time the status snapshot is collected.
   */
  public async start(unit: SystemdUnit): Promise<Result<StartStatus, UnitStartError>> {
    const scopeArgs = this.scopeArgs();
    try {
      await this.prepareUnits(scopeArgs, [unit], `start`);
    } catch (cause) {
      if (cause instanceof UnitStartError) {
        return err(cause);
      }

      return err(
        new UnitStartError(`Failed to prepare ${unit.filename} for start`, {
          cause,
          stage: `prepare`,
          unitName: unit.filename,
        }),
      );
    }

    const startArgs = [...scopeArgs, `start`, unit.filename] as const;
    try {
      await this.executor(`systemctl`, startArgs);
    } catch (cause) {
      return err(
        new UnitStartError(`Failed to start ${unit.filename}`, {
          args: startArgs,
          cause,
          command: `systemctl`,
          stage: `start`,
          unitName: unit.filename,
        }),
      );
    }

    const statusArgs = [
      ...scopeArgs,
      `show`,
      unit.filename,
      `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
    ] as const;
    let status;
    try {
      status = await this.executor(`systemctl`, statusArgs);
    } catch (cause) {
      return err(
        new UnitStartError(`Started ${unit.filename} but failed to query its status`, {
          args: statusArgs,
          cause,
          command: `systemctl`,
          stage: `show-status`,
          unitName: unit.filename,
        }),
      );
    }

    return ok(parseStartStatus(unit.filename, status.stdout));
  }

  /**
   * Reads recent output for a managed unit.
   *
   * If the unit is configured with file-backed `StandardOutput` or
   * `StandardError`, this reads directly from that file. Otherwise it falls back
   * to `systemctl status --lines ...`.
   */
  public async logs(
    unit: SystemdUnit,
    options?: LogsOptions,
  ): Promise<Result<string, UnitLogsReadError>> {
    const fileLogPath = resolveUnitLogPath(unit);
    if (fileLogPath !== undefined) {
      try {
        const output = await readFile(fileLogPath, `utf8`);
        return ok(tailLines(output, options?.lines ?? 50));
      } catch (cause) {
        return err(
          new UnitLogsReadError(`Failed to read logs for ${unit.filename} from ${fileLogPath}`, {
            cause,
            stage: `read-log-file`,
            unitName: unit.filename,
            unitPath: fileLogPath,
          }),
        );
      }
    }

    const scopeArgs = this.scopeArgs();
    const lines = options?.lines ?? 50;
    const command = [
      `systemctl`,
      ...scopeArgs,
      `status`,
      unit.filename,
      `--no-pager`,
      `--lines`,
      String(lines),
    ]
      .map(shellQuote)
      .join(` `);
    const args = [`-lc`, `${command} || true`] as const;
    let logs;
    try {
      logs = await this.executor(`bash`, args);
    } catch (cause) {
      return err(
        new UnitLogsReadError(`Failed to query logs for ${unit.filename} from systemctl status`, {
          args,
          cause,
          command: `bash`,
          stage: `status`,
          unitName: unit.filename,
        }),
      );
    }

    return ok(logs.stdout);
  }

  /** Returns the on-disk unit-file path this instance uses for the given unit. */
  public pathFor(unit: SystemdUnit): string {
    return join(this.unitDir, unit.filename);
  }

  private async prepareUnits(
    scopeArgs: readonly string[],
    units: readonly SystemdUnit[],
    operation: `enable` | `start`,
  ): Promise<void> {
    if (this.linkUnits) {
      const linkPaths = await this.collectLinkPaths(units);
      for (const path of linkPaths) {
        const args = [...scopeArgs, `link`, path] as const;
        try {
          await this.executor(`systemctl`, args);
        } catch (cause) {
          throw operation === `enable`
            ? new UnitEnableError(`Failed to link ${path} before enable`, {
                args,
                cause,
                command: `systemctl`,
                stage: `link`,
                unitName: units[0]?.filename,
              })
            : new UnitStartError(`Failed to link ${path} before start`, {
                args,
                cause,
                command: `systemctl`,
                stage: `link`,
                unitName: units[0]?.filename,
              });
        }
      }
    }

    const args = [...scopeArgs, `daemon-reload`] as const;
    try {
      await this.executor(`systemctl`, args);
    } catch (cause) {
      throw operation === `enable`
        ? new UnitEnableError(`Failed to reload systemd before enable`, {
            args,
            cause,
            command: `systemctl`,
            stage: `daemon-reload`,
            unitName: units[0]?.filename,
          })
        : new UnitStartError(`Failed to reload systemd before start`, {
            args,
            cause,
            command: `systemctl`,
            stage: `daemon-reload`,
            unitName: units[0]?.filename,
          });
    }
  }

  private scopeArgs(): readonly string[] {
    return this.scope === `user` ? [`--user`] : [];
  }

  private async collectLinkPaths(units: readonly SystemdUnit[]): Promise<readonly string[]> {
    const paths = new Set<string>();

    for (const unit of units) {
      paths.add(this.pathFor(unit));

      if (unit instanceof SystemdTimer) {
        const targetPath = join(this.unitDir, unit.targetUnit);
        if (await fileExists(targetPath)) {
          paths.add(targetPath);
        }
      }
    }

    return [...paths];
  }

  private async materializeUnits<const TUnits extends readonly SystemdUnit[]>(
    units: TUnits & ValidInstallUnits<TUnits>,
  ): Promise<
    Result<
      SystemdMaterialization<TUnits>,
      InvalidExecDirectiveError | NoUnitsProvidedError | UnitMaterializationError
    >
  > {
    if (units.length === 0) {
      return err(new NoUnitsProvidedError(`Systemd.materialize()`));
    }

    try {
      await writeUnitDirectory(this.unitDir);
    } catch (cause) {
      return err(
        new UnitMaterializationError(`Failed to create unit directory ${this.unitDir}`, {
          cause,
          operation: `create-directory`,
          unitPath: this.unitDir,
        }),
      );
    }

    const materialized: MaterializedUnit<TUnits[number]>[] = [];
    for (const unit of units) {
      const path = join(this.unitDir, unit.filename);
      try {
        await writeFile(path, unit.render(), `utf8`);
      } catch (cause) {
        if (cause instanceof InvalidExecDirectiveError) {
          return err(cause);
        }

        return err(
          new UnitMaterializationError(`Failed to materialize ${unit.filename} into ${path}`, {
            cause,
            operation: `write-file`,
            unitName: unit.filename,
            unitPath: path,
          }),
        );
      }
      materialized.push({ path, unit });
    }

    return ok(new SystemdMaterialization<TUnits>(this.unitDir, materialized));
  }
}

function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

let lazyDefaultSystemd: Systemd | undefined;

/**
 * Returns the lazily created default `Systemd` instance.
 *
 * The default instance uses the library defaults for scope, unit directory, and
 * command execution.
 */
export function defaultSystemd(): Systemd {
  lazyDefaultSystemd ??= new Systemd();
  return lazyDefaultSystemd;
}

function resolveUnitLogPath(unit: SystemdUnit): string | undefined {
  if (!(unit instanceof SystemdService)) {
    return undefined;
  }

  for (const key of [`StandardOutput`, `StandardError`] as const) {
    const value = unit.service[key];
    if (typeof value !== `string`) {
      continue;
    }

    const path = parseFileLogPath(value);
    if (path !== undefined) {
      return path;
    }
  }

  return undefined;
}

function parseFileLogPath(value: string): string | undefined {
  for (const prefix of [`append:`, `file:`] as const) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  return undefined;
}

function tailLines(output: string, lines: number): string {
  return output.split(`\n`).slice(-lines).join(`\n`);
}

async function writeUnitDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
