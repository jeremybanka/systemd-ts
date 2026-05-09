import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ExecutableOptions } from "./types.ts";

const currentModulePath = fileURLToPath(import.meta.url);

/**
 * An immutable description of a runnable module entrypoint that can be used in
 * executable-valued systemd unit directives.
 *
 * `Executable` captures three pieces of information:
 * - the absolute runtime binary that should launch the module
 * - the absolute path to the module itself
 * - any additional arguments that should be passed after the module path
 *
 * Most consumers will create one via {@link defineExecutable} and then pass it
 * into a {@link SystemdService} directive such as `ExecStart`, `ExecStop`, or
 * `ExecReload`.
 */
export class Executable {
  /** Additional arguments passed after the module path. */
  public readonly args: readonly string[];
  /** Absolute path to the module that should be executed. */
  public readonly modulePath: string;
  /** Absolute path to the runtime binary that should launch the module. */
  public readonly runtimeEntrypoint: string;

  /**
   * Creates an executable description.
   *
   * When `modulePath` is omitted, the calling module is inferred from the
   * current stack so `defineExecutable()` can be used inline from the module
   * that should become runnable.
   *
   * When `runtimeEntrypoint` is omitted, the current process executable is
   * used. This works well for the common case where the same runtime that is
   * evaluating your module should also be used by systemd.
   */
  public constructor(options: ExecutableOptions = {}) {
    this.runtimeEntrypoint = options.runtimeEntrypoint ?? process.execPath;
    this.modulePath = options.modulePath ?? inferCallerModulePath();
    this.args = Object.freeze([...(options.args ?? [])]);
    Object.freeze(this);
  }

  /**
   * Returns the executable as raw command parts.
   *
   * The first element is always the runtime entrypoint, followed by the module
   * path and any configured arguments.
   */
  public toCommandParts(): readonly [string, ...string[]] {
    return [this.runtimeEntrypoint, this.modulePath, ...this.args];
  }

  /**
   * Renders the executable as a shell-quoted command string suitable for
   * executable-valued systemd directives such as `ExecStart=`.
   */
  public toExecStart(): string {
    return this.toCommandParts().map(shellQuote).join(` `);
  }
}

/**
 * Defines a module as a runnable executable and returns its immutable
 * `Executable` description.
 *
 * This helper is designed for the pattern:
 *
 * ```ts
 * export default defineExecutable(async () => {
 *   // do work here
 * });
 * ```
 *
 * When the defining module is executed as the main entrypoint, `fn` is invoked.
 * When the module is merely imported, `fn` is not run and only the executable
 * description is returned.
 *
 * Pass `options.runtimeEntrypoint` to override the default runtime binary when
 * the current process is not the exact runtime you want systemd to use.
 */
export function defineExecutable(
  fn: () => void | Promise<void>,
  options: ExecutableOptions = {},
): Executable {
  const executable = new Executable(options);

  if (isMainModule(executable.modulePath)) {
    void Promise.resolve(fn()).catch((error: unknown) => {
      process.exitCode = 1;
      throw error;
    });
  }

  return executable;
}

function inferCallerModulePath(): string {
  const stack = new Error().stack ?? ``;
  for (const line of stack.split(`\n`).slice(1)) {
    const candidate = extractStackPath(line);
    if (candidate === undefined || candidate === currentModulePath) {
      continue;
    }

    return candidate;
  }

  throw new Error(
    `Could not infer the calling module path for defineExecutable(); pass { modulePath } explicitly`,
  );
}

function extractStackPath(line: string): string | undefined {
  const fileUrlMatch = line.match(/(file:\/\/\/[^)\s:]+(?:\.[cm]?[jt]s)?)/u);
  if (fileUrlMatch !== null) {
    return fileURLToPath(fileUrlMatch[1]);
  }

  const pathMatch = line.match(/(\/[^)\s:]+(?:\.[cm]?[jt]s)?)/u);
  if (pathMatch !== null) {
    return pathMatch[1];
  }

  return undefined;
}

function isMainModule(modulePath: string): boolean {
  const mainArg = process.argv[1];
  if (mainArg === undefined) {
    return false;
  }

  return normalizeFilePath(mainArg) === normalizeFilePath(modulePath);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
}

function normalizeFilePath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}
