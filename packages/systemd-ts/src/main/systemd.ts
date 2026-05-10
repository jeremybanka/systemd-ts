import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  assertInstallableTogether,
  defaultCommandExecutor,
  defaultUnitDirForScope,
  fileExists,
  parseStartResult,
  shellQuote,
} from "./internal.ts";
import { SystemdService } from "./systemd-service.ts";
import { SystemdTimer } from "./systemd-timer.ts";
import type {
  CommandExecutor,
  InstalledUnit,
  LogsOptions,
  StartResult,
  SystemdOptions,
  SystemdUnit,
  ValidInstallUnits,
} from "./types.ts";

/**
 * The result of materializing one or more units with {@link Systemd.materialize}.
 *
 * It records the target directory and the on-disk path associated with each
 * materialized unit.
 */
export class SystemdMaterializeResult<
  TUnits extends readonly SystemdUnit[] = readonly SystemdUnit[],
> {
  /** The directory units were written into. */
  public readonly directory: string;
  /** The materialized units together with their resolved on-disk paths. */
  public readonly materialized: readonly InstalledUnit<TUnits[number]>[];
  private readonly pathByFilename: ReadonlyMap<string, string>;

  public constructor(directory: string, materialized: readonly InstalledUnit<TUnits[number]>[]) {
    this.directory = directory;
    this.materialized = Object.freeze([...materialized]);
    this.pathByFilename = new Map(materialized.map((entry) => [entry.unit.filename, entry.path]));
    Object.freeze(this);
  }

  /** Returns the on-disk path for a previously materialized unit. */
  public pathFor(unit: TUnits[number]): string {
    const path = this.pathByFilename.get(unit.filename);
    if (path === undefined) {
      throw new Error(`No materialized path is recorded for ${unit.filename}`);
    }

    return path;
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
   * start the units on its own. When both timers and services are materialized
   * together, compile-time and runtime attachment checks ensure the timer points
   * at one of the accompanying services.
   */
  public async materialize<const TUnits extends readonly SystemdUnit[]>(
    ...units: TUnits & ValidInstallUnits<TUnits>
  ): Promise<SystemdMaterializeResult<TUnits>> {
    return this.materializeUnits(units);
  }

  /**
   * Enables one or more units via `systemctl enable`.
   *
   * When `linkUnits` is enabled, this first links materialized unit files into the
   * target manager and reloads systemd so the units are visible before the
   * enable operation runs.
   */
  public async enable(...units: readonly SystemdUnit[]): Promise<void> {
    if (units.length === 0) {
      throw new Error(`Systemd.enable() requires at least one service or timer`);
    }

    const scopeArgs = this.scopeArgs();
    await this.prepareUnits(scopeArgs, units);

    for (const unit of units) {
      await this.executor(`systemctl`, [...scopeArgs, `enable`, unit.filename]);
    }
  }

  /**
   * Starts a unit and returns a parsed `systemctl show` snapshot of its final
   * observed state.
   *
   * For oneshot services, a successful result commonly means `ActiveState` is
   * already back to `inactive` by the time the status snapshot is collected.
   */
  public async start(unit: SystemdUnit): Promise<StartResult> {
    const scopeArgs = this.scopeArgs();
    await this.prepareUnits(scopeArgs, [unit]);
    await this.executor(`systemctl`, [...scopeArgs, `start`, unit.filename]);

    const status = await this.executor(`systemctl`, [
      ...scopeArgs,
      `show`,
      unit.filename,
      `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
    ]);

    return parseStartResult(unit.filename, status.stdout);
  }

  /**
   * Reads recent output for a managed unit.
   *
   * If the unit is configured with file-backed `StandardOutput` or
   * `StandardError`, this reads directly from that file. Otherwise it falls back
   * to `systemctl status --lines ...`.
   */
  public async logs(unit: SystemdUnit, options?: LogsOptions): Promise<string> {
    const fileLogPath = resolveUnitLogPath(unit);
    if (fileLogPath !== undefined) {
      const output = await readFile(fileLogPath, `utf8`);
      return tailLines(output, options?.lines ?? 50);
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
    const logs = await this.executor(`bash`, [`-lc`, `${command} || true`]);

    return logs.stdout;
  }

  /** Returns the on-disk unit-file path this instance uses for the given unit. */
  public pathFor(unit: SystemdUnit): string {
    return join(this.unitDir, unit.filename);
  }

  private async prepareUnits(
    scopeArgs: readonly string[],
    units: readonly SystemdUnit[],
  ): Promise<void> {
    if (this.linkUnits) {
      const linkPaths = await this.collectLinkPaths(units);
      for (const path of linkPaths) {
        await this.executor(`systemctl`, [...scopeArgs, `link`, path]);
      }
    }

    await this.executor(`systemctl`, [...scopeArgs, `daemon-reload`]);
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
  ): Promise<SystemdMaterializeResult<TUnits>> {
    if (units.length === 0) {
      throw new Error(`Systemd.materialize() requires at least one service or timer`);
    }

    assertInstallableTogether(units);
    await writeUnitDirectory(this.unitDir);

    const materialized: InstalledUnit<TUnits[number]>[] = [];
    for (const unit of units) {
      const path = join(this.unitDir, unit.filename);
      await writeFile(path, unit.render(), `utf8`);
      materialized.push({ path, unit });
    }

    return new SystemdMaterializeResult<TUnits>(this.unitDir, materialized);
  }
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
