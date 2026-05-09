import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ExecutableOptions } from "./types.ts";

const currentModulePath = fileURLToPath(import.meta.url);

export class Executable {
  public readonly args: readonly string[];
  public readonly modulePath: string;
  public readonly runtimeEntrypoint: string;

  public constructor(options: ExecutableOptions = {}) {
    this.runtimeEntrypoint = options.runtimeEntrypoint ?? process.execPath;
    this.modulePath = options.modulePath ?? inferCallerModulePath();
    this.args = Object.freeze([...(options.args ?? [])]);
    Object.freeze(this);
  }

  public toCommandParts(): readonly [string, ...string[]] {
    return [this.runtimeEntrypoint, this.modulePath, ...this.args];
  }

  public toExecStart(): string {
    return this.toCommandParts().map(shellQuote).join(` `);
  }
}

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
