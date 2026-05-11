import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import { x as extractTarball } from "tar";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, `../..`);
const manpagesRoot = join(root, `.manpages`);
const cacheRoot = join(manpagesRoot, `.cache`);
const trackedVersionPath = join(root, `systemd.version`);
const releaseApiBaseUrl = `https://api.github.com/repos/systemd/systemd/releases/tags`;
const sourceArchiveBaseUrl = `https://github.com/systemd/systemd/archive/refs/tags`;
const requiredFiles = [
  `README`,
  `NEWS`,
  `man/meson.build`,
  `man/systemd.service.xml`,
  `man/systemd.timer.xml`,
  `man/systemd.unit.xml`,
  `man/version-info.xml`,
] as const;

const [, , ...argv] = process.argv;
const requestedVersion =
  argv.find((argument) => ![`--`, `--current`].includes(argument)) ??
  (argv.length === 0 || argv.includes(`--current`)
    ? (await readFile(trackedVersionPath, `utf8`)).trim()
    : undefined);

if (argv.includes(`--help`) || argv.includes(`-h`)) {
  console.log(`Usage:
  pnpm run manpages:fetch
  pnpm run manpages:fetch -- v260
  pnpm run manpages:fetch -- v260.1
  pnpm run manpages:fetch -- --current
`);
  process.exit(0);
}

if (!requestedVersion) {
  throw new Error(`Could not determine a systemd version to fetch.`);
}

const version = requestedVersion.trim().replace(/^v/, ``);
if (!/^\d+(?:\.\d+)*$/.test(version)) {
  throw new Error(
    `Unsupported version "${requestedVersion}". Expected "v260", "260", "v260.1", or "260.1".`,
  );
}

const tag = `v${version}`;
const versionRoot = join(manpagesRoot, version);
const sourceRoot = join(versionRoot, `source`);
const manifestPath = join(versionRoot, `manifest.json`);
const tarballPath = join(cacheRoot, `systemd-${tag}.tar.gz`);
const releaseUrl = `${releaseApiBaseUrl}/${encodeURIComponent(tag)}`;
const sourceArchiveUrl = `${sourceArchiveBaseUrl}/${tag}.tar.gz`;

if (await hasValidCache()) {
  console.log(`Reusing cached manpages for ${tag} from ${sourceRoot}`);
  process.exit(0);
}

await mkdir(cacheRoot, { recursive: true });

const release = await fetchJson(releaseUrl);
if (release.tag_name !== tag) {
  throw new Error(`Resolved release ${release.tag_name} does not match requested tag ${tag}.`);
}

if (!(await exists(tarballPath))) {
  console.log(`Downloading ${tag} source tarball...`);
  await download(sourceArchiveUrl, tarballPath);
} else {
  console.log(`Reusing cached tarball ${tarballPath}`);
}

const stagedRoot = await mkdtemp(join(cacheRoot, `${version}-staging-`));
const stagedSourceRoot = join(stagedRoot, `source`);

try {
  await mkdir(stagedSourceRoot, { recursive: true });

  try {
    await Promise.resolve(extract(stagedSourceRoot));
  } catch {
    await rm(tarballPath, { force: true });
    await rm(stagedSourceRoot, { recursive: true, force: true });
    await mkdir(stagedSourceRoot, { recursive: true });
    console.warn(`Cached tarball for ${tag} could not be extracted. Downloading again...`);
    await download(sourceArchiveUrl, tarballPath);
    await Promise.resolve(extract(stagedSourceRoot));
  }

  const manXmlFileCount = await validate(stagedSourceRoot);
  const tarball = await stat(tarballPath);

  await mkdir(versionRoot, { recursive: true });
  await rm(sourceRoot, { recursive: true, force: true });
  await rename(stagedSourceRoot, sourceRoot);
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        tag,
        version,
        fetchedAt: Temporal.Now.instant().toString(),
        releaseUrl: release.html_url,
        tarballUrl: sourceArchiveUrl,
        tarballBytes: tarball.size,
        manXmlFileCount,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Cached ${tag} manpages into ${sourceRoot}`);
} finally {
  await rm(stagedRoot, { recursive: true, force: true });
}

async function hasValidCache() {
  if (!(await exists(manifestPath))) {
    return false;
  }

  const manifest = JSON.parse(await readFile(manifestPath, `utf8`)) as {
    tag?: string;
    version?: string;
  };

  if (manifest.tag !== tag || manifest.version !== version) {
    return false;
  }

  try {
    await validate(sourceRoot);
    return true;
  } catch {
    return false;
  }
}

async function validate(directory: string) {
  for (const relativePath of requiredFiles) {
    if (!(await exists(join(directory, relativePath)))) {
      throw new Error(
        `The extracted tree is incomplete. Missing ${join(directory, relativePath)}.`,
      );
    }
  }

  const versionInfo = await readFile(join(directory, `man/version-info.xml`), `utf8`);
  const majorVersion = version.split(`.`)[0];
  if (!versionInfo.includes(`Added in version ${majorVersion}.`)) {
    throw new Error(`version-info.xml does not mention systemd major version ${majorVersion}.`);
  }

  const pending = [join(directory, `man`)];
  let manXmlFileCount = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(`.xml`)) {
        manXmlFileCount += 1;
      }
    }
  }

  if (manXmlFileCount < 200) {
    throw new Error(
      `The extracted tree looks incomplete. Expected at least 200 man XML files, found ${manXmlFileCount}.`,
    );
  }

  return manXmlFileCount;
}

function extract(outputPath: string) {
  return extractTarball({
    file: tarballPath,
    cwd: outputPath,
    gzip: true,
    strip: 1,
    filter: (archivePath) => {
      const relativePath = archivePath.split(`/`).slice(1).join(`/`);
      return (
        relativePath === `README` || relativePath === `NEWS` || relativePath.startsWith(`man/`)
      );
    },
  });
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: `application/vnd.github+json`,
      "User-Agent": `systemd-ts-manpages-fetcher`,
    },
  });

  if (response.status === 404) {
    throw new Error(`systemd release ${tag} could not be resolved from GitHub Releases.`);
  }

  if (!response.ok) {
    throw new Error(`Failed to resolve release ${tag}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<{ html_url: string; tag_name: string }>;
}

async function download(url: string, outputPath: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": `systemd-ts-manpages-fetcher` },
    redirect: `follow`,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download tarball: ${response.status} ${response.statusText}`);
  }

  const temporaryPath = `${outputPath}.download`;
  try {
    await pipeline(response.body, createWriteStream(temporaryPath));
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
