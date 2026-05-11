import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  defaultCommandExecutor,
  defaultUnitDirForScope,
  extractCommandOutput,
  fileExists,
  parseStartStatus,
  type Result,
} from "./internal.ts";
import {
  classifyMaterializationReason,
  NoUnitsProvidedError,
  ExecutableInferenceError,
  InvalidExecDirectiveError,
  UnitEnableError,
  UnitLogsReadError,
  UnitMaterializationError,
  UnitStartError,
} from "./errors.ts";
import { SystemdService } from "./systemd-service.ts";
import { Systemctl } from "./systemctl.ts";
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

export interface SystemdTsAttachOptions {
  readonly owner: string;
  readonly enable?: boolean;
  readonly start?: boolean;
}

export interface SystemdTsDetachOptions {
  readonly deleteUnitFiles?: boolean;
  readonly disable?: boolean;
  readonly stop?: boolean;
}

export interface SystemdTsReattachOptions extends SystemdTsAttachOptions {
  readonly disableRemoved?: boolean;
  readonly prune?: boolean;
  readonly restartUpdated?: boolean;
  readonly stopRemoved?: boolean;
}

export interface SystemdTsAttachmentSelector {
  readonly owner: string;
}

export interface SystemdTsAttachmentResult {
  readonly added: readonly string[];
  readonly directory: string;
  readonly enabled: readonly string[];
  readonly manifestPath: string;
  readonly owner: string;
  readonly removed: readonly string[];
  readonly restarted: readonly string[];
  readonly started: readonly string[];
  readonly unchanged: readonly string[];
  readonly updated: readonly string[];
}

interface AttachmentManifest {
  readonly owner: string;
  readonly units: readonly {
    readonly filename: string;
    readonly path: string;
  }[];
  readonly version: 1;
}

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
  /** The low-level `systemctl` client for this configured target. */
  public readonly systemctl: Systemctl;
  /** Higher-level `systemd-ts` upkeep helpers for application-owned units. */
  public readonly ts: SystemdTs;
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
    this.systemctl = new Systemctl({
      executor: this.executor,
      scope: this.scope,
    });
    this.ts = new SystemdTs(this);
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
      | ExecutableInferenceError
      | InvalidExecDirectiveError
      | NoUnitsProvidedError
      | UnitMaterializationError
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
      const enabled = await this.systemctl.enable(unit.filename);
      if (!enabled.ok) {
        const errorOptions = {
          args,
          cause: enabled.error,
          command: `systemctl`,
          stage: `enable`,
          unitName: unit.filename,
          ...(enabled.error.environmentReason === undefined
            ? {}
            : { environmentReason: enabled.error.environmentReason }),
        };
        return err(new UnitEnableError(`Failed to enable ${unit.filename}`, errorOptions));
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
          diagnostics: await this.collectStartDiagnostics(scopeArgs, unit.filename),
          stage: `prepare`,
          unitName: unit.filename,
        }),
      );
    }

    const startArgs = [...scopeArgs, `start`, unit.filename] as const;
    const started = await this.systemctl.start(unit.filename);
    if (!started.ok) {
      const errorOptions = {
        args: startArgs,
        cause: started.error,
        command: `systemctl`,
        diagnostics: await this.collectStartDiagnostics(scopeArgs, unit.filename),
        stage: `start`,
        unitName: unit.filename,
        ...(started.error.environmentReason === undefined
          ? {}
          : { environmentReason: started.error.environmentReason }),
      };
      return err(new UnitStartError(`Failed to start ${unit.filename}`, errorOptions));
    }

    const status = await this.systemctl.showServiceStatus(unit.filename);
    if (!status.ok) {
      const errorOptions = {
        args: [
          ...scopeArgs,
          `show`,
          unit.filename,
          `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
        ] as const,
        cause: status.error,
        command: `systemctl`,
        diagnostics: await this.collectStartDiagnostics(scopeArgs, unit.filename),
        stage: `show-status`,
        unitName: unit.filename,
        ...(status.error.environmentReason === undefined
          ? {}
          : { environmentReason: status.error.environmentReason }),
      };
      return err(
        new UnitStartError(`Started ${unit.filename} but failed to query its status`, errorOptions),
      );
    }
    return ok(status.value);
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
            reason: isMissingPathError(cause) ? `missing-log-file` : `log-file-read-failed`,
            stage: `read-log-file`,
            unitName: unit.filename,
            unitPath: fileLogPath,
          }),
        );
      }
    }

    const scopeArgs = this.scopeArgs();
    const lines = options?.lines ?? 50;
    const logs = await this.systemctl.status(unit.filename, {
      lines,
    });
    if (logs.ok) {
      return ok(joinCommandOutput(logs.value));
    }

    const errorOutput = extractCommandOutput(logs.error);
    if (errorOutput !== undefined) {
      return ok(joinCommandOutput(errorOutput));
    }

    const args = [
      ...scopeArgs,
      `status`,
      unit.filename,
      `--no-pager`,
      `--lines`,
      String(lines),
    ] as const;
    return err(
      new UnitLogsReadError(`Failed to query logs for ${unit.filename} from systemctl status`, {
        args,
        cause: logs.error,
        command: `systemctl`,
        reason: `status-command-failed`,
        stage: `status`,
        unitName: unit.filename,
      }),
    );
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
        const linked = await this.systemctl.link(path);
        if (!linked.ok) {
          const linkedUnit = units.find((candidate) => this.pathFor(candidate) === path);
          const errorContext = {
            args,
            cause: linked.error,
            command: `systemctl`,
            stage: `link`,
            unitPath: path,
            ...(linked.error.environmentReason === undefined
              ? {}
              : { environmentReason: linked.error.environmentReason }),
            ...(linkedUnit === undefined ? {} : { unitName: linkedUnit.filename }),
          };
          throw operation === `enable`
            ? new UnitEnableError(`Failed to link ${path} before enable`, errorContext)
            : new UnitStartError(`Failed to link ${path} before start`, errorContext);
        }
      }
    }

    const args = [...scopeArgs, `daemon-reload`] as const;
    const reloaded = await this.systemctl.daemonReload();
    if (!reloaded.ok) {
      const errorContext = {
        args,
        cause: reloaded.error,
        command: `systemctl`,
        stage: `daemon-reload`,
        ...(reloaded.error.environmentReason === undefined
          ? {}
          : { environmentReason: reloaded.error.environmentReason }),
        ...(units[0]?.filename === undefined ? {} : { unitName: units[0].filename }),
      };
      throw operation === `enable`
        ? new UnitEnableError(`Failed to reload systemd before enable`, errorContext)
        : new UnitStartError(`Failed to reload systemd before start`, errorContext);
    }
  }

  private scopeArgs(): readonly string[] {
    return this.scope === `user` ? [`--user`] : [];
  }

  private async collectStartDiagnostics(
    scopeArgs: readonly string[],
    unitName: string,
  ): Promise<{
    readonly showOutput?: string;
    readonly showStatus?: StartStatus;
    readonly statusOutput?: string;
  }> {
    const diagnostics: {
      showOutput?: string;
      showStatus?: StartStatus;
      statusOutput?: string;
    } = {};

    const showArgs = [
      ...scopeArgs,
      `show`,
      unitName,
      `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
    ] as const;
    const show = await this.tryBestEffortCommand(`systemctl`, showArgs);
    if (show !== undefined) {
      const showOutput = joinCommandOutput(show);
      if (showOutput.length > 0) {
        diagnostics.showOutput = showOutput;
      }
      if (show.stdout.length > 0) {
        diagnostics.showStatus = parseStartStatus(unitName, show.stdout);
      }
    }

    const statusArgs = [...scopeArgs, `status`, unitName, `--no-pager`, `--lines`, `20`] as const;
    const status = await this.tryBestEffortCommand(`systemctl`, statusArgs);
    if (status !== undefined) {
      const statusOutput = joinCommandOutput(status);
      if (statusOutput.length > 0) {
        diagnostics.statusOutput = statusOutput;
      }
    }

    return diagnostics;
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
      | ExecutableInferenceError
      | InvalidExecDirectiveError
      | NoUnitsProvidedError
      | UnitMaterializationError
    >
  > {
    if (units.length === 0) {
      return err(new NoUnitsProvidedError(`Systemd.materialize()`));
    }

    try {
      await writeUnitDirectory(this.unitDir);
    } catch (cause) {
      const reason = classifyMaterializationReason(cause);
      return err(
        new UnitMaterializationError(`Failed to create unit directory ${this.unitDir}`, {
          cause,
          operation: `create-directory`,
          ...(reason === undefined ? {} : { reason }),
          unitPath: this.unitDir,
        }),
      );
    }

    const materialized: MaterializedUnit<TUnits[number]>[] = [];
    for (const unit of units) {
      const path = join(this.unitDir, unit.filename);
      const rendered = unit.render();
      if (!rendered.ok) {
        return err(rendered.error);
      }
      try {
        await writeFile(path, rendered.value, `utf8`);
      } catch (cause) {
        if (cause instanceof InvalidExecDirectiveError) {
          return err(cause);
        }

        const reason = classifyMaterializationReason(cause);
        return err(
          new UnitMaterializationError(`Failed to materialize ${unit.filename} into ${path}`, {
            cause,
            operation: `write-file`,
            ...(reason === undefined ? {} : { reason }),
            unitName: unit.filename,
            unitPath: path,
          }),
        );
      }
      materialized.push({ path, unit });
    }

    return ok(new SystemdMaterialization<TUnits>(this.unitDir, materialized));
  }

  private async tryBestEffortCommand(
    command: string,
    args: readonly string[],
  ): Promise<
    | {
        readonly stderr: string;
        readonly stdout: string;
      }
    | undefined
  > {
    try {
      return await this.executor(command, args);
    } catch (cause) {
      const output = extractCommandOutput(cause);
      if (output !== undefined) {
        return output;
      }
      return undefined;
    }
  }
}

/**
 * Opinionated `systemd-ts` upkeep helpers for application-owned units.
 *
 * This layer is intentionally analogous to a subset of `portablectl`'s
 * ownership workflow, but it operates on regular materialized units instead of
 * portable service images.
 */
export class SystemdTs {
  private readonly systemd: Systemd;

  public constructor(systemd: Systemd) {
    this.systemd = systemd;
    Object.freeze(this);
  }

  public async attach(
    units: readonly SystemdUnit[],
    options: SystemdTsAttachOptions,
  ): Promise<
    Result<
      SystemdTsAttachmentResult,
      | ExecutableInferenceError
      | InvalidExecDirectiveError
      | NoUnitsProvidedError
      | UnitEnableError
      | UnitMaterializationError
      | UnitStartError
    >
  > {
    if (units.length === 0) {
      return err(new NoUnitsProvidedError(`Systemd.ts.attach()`));
    }

    const described = await this.describeUnits(units);
    if (!described.ok) {
      return described;
    }

    const manifestPath = this.manifestPathFor(options.owner);
    const prior = await this.readManifest(options.owner);
    const diff = await this.diffManifest(prior, described.value);
    const materialized = await this.systemd.materialize(
      ...(units as readonly SystemdUnit[] & ValidInstallUnits<readonly SystemdUnit[]>),
    );
    if (!materialized.ok) {
      return materialized;
    }

    const enabled: string[] = [];
    if (options.enable ?? false) {
      const result = await this.systemd.enable(...units);
      if (!result.ok) {
        return result;
      }
      enabled.push(...units.map((unit) => unit.filename));
    }

    const started: string[] = [];
    if (options.start ?? false) {
      for (const unit of units) {
        const result = await this.systemd.start(unit);
        if (!result.ok) {
          return result;
        }
        started.push(unit.filename);
      }
    }

    await this.writeManifest(options.owner, described.value);

    return ok({
      added: diff.added,
      directory: this.systemd.unitDir,
      enabled,
      manifestPath,
      owner: options.owner,
      removed: diff.removed,
      restarted: [],
      started,
      unchanged: diff.unchanged,
      updated: diff.updated,
    });
  }

  public async detach(
    selector: SystemdTsAttachmentSelector,
    options: SystemdTsDetachOptions = {},
  ): Promise<
    Result<
      {
        readonly deleted: readonly string[];
        readonly detached: readonly string[];
        readonly disabled: readonly string[];
        readonly owner: string;
        readonly stopped: readonly string[];
      },
      Error
    >
  > {
    const manifest = await this.readManifest(selector.owner);
    if (manifest === undefined) {
      return ok({
        deleted: [],
        detached: [],
        disabled: [],
        owner: selector.owner,
        stopped: [],
      });
    }

    const filenames = manifest.units.map((unit) => unit.filename);
    const deleted: string[] = [];
    const disabled: string[] = [];
    const stopped: string[] = [];

    if (options.stop ?? true) {
      await this.runSystemctl(`stop`, filenames);
      stopped.push(...filenames);
    }
    if (options.disable ?? true) {
      await this.runSystemctl(`disable`, filenames);
      disabled.push(...filenames);
    }
    if (options.deleteUnitFiles ?? true) {
      for (const unit of manifest.units) {
        await this.removeManagedUnitPath(unit.path);
        await rm(unit.path, { force: true });
        deleted.push(unit.filename);
      }
      await this.runSystemctl(`daemon-reload`);
    }

    await rm(this.manifestPathFor(selector.owner), { force: true });

    return ok({
      deleted,
      detached: filenames,
      disabled,
      owner: selector.owner,
      stopped,
    });
  }

  public async reattach(
    units: readonly SystemdUnit[],
    options: SystemdTsReattachOptions,
  ): Promise<
    Result<
      SystemdTsAttachmentResult,
      | ExecutableInferenceError
      | InvalidExecDirectiveError
      | NoUnitsProvidedError
      | UnitEnableError
      | UnitMaterializationError
      | UnitStartError
      | Error
    >
  > {
    if (units.length === 0) {
      return err(new NoUnitsProvidedError(`Systemd.ts.reattach()`));
    }

    const described = await this.describeUnits(units);
    if (!described.ok) {
      return described;
    }

    const manifestPath = this.manifestPathFor(options.owner);
    const prior = await this.readManifest(options.owner);
    const diff = await this.diffManifest(prior, described.value);

    if ((options.stopRemoved ?? true) && diff.removed.length > 0) {
      await this.runSystemctl(`stop`, diff.removed);
    }
    if ((options.disableRemoved ?? true) && diff.removed.length > 0) {
      await this.runSystemctl(`disable`, diff.removed);
    }
    if ((options.prune ?? true) && prior !== undefined) {
      for (const unit of prior.units) {
        if (!diff.removed.includes(unit.filename)) {
          continue;
        }
        await this.removeManagedUnitPath(unit.path);
        await rm(unit.path, { force: true });
      }
      if (diff.removed.length > 0) {
        await this.runSystemctl(`daemon-reload`);
      }
    }

    const materialized = await this.systemd.materialize(
      ...(units as readonly SystemdUnit[] & ValidInstallUnits<readonly SystemdUnit[]>),
    );
    if (!materialized.ok) {
      return materialized;
    }

    const enabled: string[] = [];
    if (options.enable ?? false) {
      const result = await this.systemd.enable(...units);
      if (!result.ok) {
        return result;
      }
      enabled.push(...units.map((unit) => unit.filename));
    }

    const restarted: string[] = [];
    if (options.restartUpdated ?? false) {
      const restartable = units
        .filter((unit) => diff.updated.includes(unit.filename))
        .map((unit) => unit.filename);
      if (restartable.length > 0) {
        await this.runSystemctl(`restart`, restartable);
        restarted.push(...restartable);
      }
    }

    const started: string[] = [];
    if (options.start ?? false) {
      for (const unit of units) {
        if (restarted.includes(unit.filename)) {
          continue;
        }
        const result = await this.systemd.start(unit);
        if (!result.ok) {
          return result;
        }
        started.push(unit.filename);
      }
    }

    await this.writeManifest(options.owner, described.value);

    return ok({
      added: diff.added,
      directory: this.systemd.unitDir,
      enabled,
      manifestPath,
      owner: options.owner,
      removed: diff.removed,
      restarted,
      started,
      unchanged: diff.unchanged,
      updated: diff.updated,
    });
  }

  private async describeUnits(
    units: readonly SystemdUnit[],
  ): Promise<
    Result<
      readonly {
        readonly filename: string;
        readonly path: string;
        readonly rendered: string;
      }[],
      ExecutableInferenceError | InvalidExecDirectiveError
    >
  > {
    const described = [];
    for (const unit of units) {
      const rendered = unit.render();
      if (!rendered.ok) {
        return rendered;
      }
      described.push({
        filename: unit.filename,
        path: this.systemd.pathFor(unit),
        rendered: rendered.value,
      });
    }

    return ok(described);
  }

  private async diffManifest(
    prior: AttachmentManifest | undefined,
    desired: readonly {
      readonly filename: string;
      readonly path: string;
      readonly rendered: string;
    }[],
  ): {
    readonly added: readonly string[];
    readonly removed: readonly string[];
    readonly unchanged: readonly string[];
    readonly updated: readonly string[];
  } {
    const priorUnits = new Map(prior?.units.map((unit) => [unit.filename, unit.path]) ?? []);
    const desiredNames = new Set(desired.map((unit) => unit.filename));
    const added: string[] = [];
    const removed = [...priorUnits.keys()].filter((filename) => !desiredNames.has(filename));
    const unchanged: string[] = [];
    const updated: string[] = [];

    for (const unit of desired) {
      const priorPath = priorUnits.get(unit.filename);
      if (priorPath === undefined) {
        added.push(unit.filename);
        continue;
      }

      try {
        const current = await readFile(priorPath, `utf8`);
        if (current === unit.rendered) {
          unchanged.push(unit.filename);
          continue;
        }
      } catch {
        added.push(unit.filename);
        continue;
      }

      updated.push(unit.filename);
    }

    return {
      added,
      removed,
      unchanged,
      updated,
    };
  }

  private async manifestDir(): Promise<string> {
    const directory = join(this.systemd.unitDir, `.systemd-ts`);
    await mkdir(directory, { recursive: true });
    return directory;
  }

  private manifestPathFor(owner: string): string {
    return join(this.systemd.unitDir, `.systemd-ts`, `${encodeURIComponent(owner)}.json`);
  }

  private async readManifest(owner: string): Promise<AttachmentManifest | undefined> {
    try {
      const content = await readFile(this.manifestPathFor(owner), `utf8`);
      return JSON.parse(content) as AttachmentManifest;
    } catch {
      return undefined;
    }
  }

  private async runSystemctl(action: string, units: readonly string[] = []): Promise<void> {
    const args =
      action === `daemon-reload`
        ? [...this.scopeArgs(), action]
        : [...this.scopeArgs(), action, ...units];
    await this.systemd.executor(`systemctl`, args);
  }

  private async removeManagedUnitPath(path: string): Promise<void> {
    const command = `rm -f ${shellQuote(path)}`;
    await this.systemd.executor(`bash`, [`-lc`, command]);
  }

  private scopeArgs(): readonly string[] {
    return this.systemd.scope === `user` ? [`--user`] : [];
  }

  private async writeManifest(
    owner: string,
    units: readonly {
      readonly filename: string;
      readonly path: string;
      readonly rendered: string;
    }[],
  ): Promise<void> {
    await this.manifestDir();
    const manifest: AttachmentManifest = {
      owner,
      units: units.map((unit) => ({
        filename: unit.filename,
        path: unit.path,
      })),
      version: 1,
    };
    await writeFile(this.manifestPathFor(owner), JSON.stringify(manifest, null, 2), `utf8`);
  }
}

function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

function joinCommandOutput(output: { readonly stderr: string; readonly stdout: string }): string {
  return [output.stdout, output.stderr].filter((value) => value.length > 0).join(`\n`);
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

function isMissingPathError(cause: unknown): boolean {
  if (cause === null || typeof cause !== `object`) {
    return false;
  }

  return (cause as Record<string, unknown>)[`code`] === `ENOENT`;
}

async function writeUnitDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
