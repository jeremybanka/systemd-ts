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

export class SystemdInstallResult<TUnits extends readonly SystemdUnit[] = readonly SystemdUnit[]> {
  public readonly directory: string;
  public readonly installed: readonly InstalledUnit<TUnits[number]>[];
  private readonly pathByFilename: ReadonlyMap<string, string>;

  public constructor(directory: string, installed: readonly InstalledUnit<TUnits[number]>[]) {
    this.directory = directory;
    this.installed = Object.freeze([...installed]);
    this.pathByFilename = new Map(installed.map((entry) => [entry.unit.filename, entry.path]));
    Object.freeze(this);
  }

  public pathFor(unit: TUnits[number]): string {
    const path = this.pathByFilename.get(unit.filename);
    if (path === undefined) {
      throw new Error(`No installed path is recorded for ${unit.filename}`);
    }

    return path;
  }
}

export class Systemd {
  public readonly executor: CommandExecutor;
  public readonly linkUnits: boolean;
  public readonly scope: `system` | `user`;
  public readonly unitDir: string;

  public constructor(options: SystemdOptions = {}) {
    this.scope = options.scope ?? `system`;
    this.unitDir = options.unitDir ?? defaultUnitDirForScope(this.scope);
    this.linkUnits = options.linkUnits ?? false;
    this.executor = options.executor ?? defaultCommandExecutor;
    Object.freeze(this);
  }

  public async install<const TUnits extends readonly SystemdUnit[]>(
    ...units: TUnits & ValidInstallUnits<TUnits>
  ): Promise<SystemdInstallResult<TUnits>> {
    if (units.length === 0) {
      throw new Error(`Systemd.install() requires at least one service or timer`);
    }

    assertInstallableTogether(units);
    await writeUnitDirectory(this.unitDir);

    const installed: InstalledUnit<TUnits[number]>[] = [];
    for (const unit of units) {
      const path = join(this.unitDir, unit.filename);
      await writeFile(path, unit.render(), `utf8`);
      installed.push({ path, unit });
    }

    return new SystemdInstallResult<TUnits>(this.unitDir, installed);
  }

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
}

let lazyDefaultSystemd: Systemd | undefined;

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
