import { writeFile } from "node:fs/promises";

import { defineExecutable, Executable } from "../../src/index.ts";

const markerFile = process.env[`SYSTEMD_TS_MARKER_FILE`];

if (markerFile === undefined) {
  throw new Error(`SYSTEMD_TS_MARKER_FILE must be set for executable fixture tests`);
}

const exe: Executable = defineExecutable(() => writeFile(markerFile, `ran`, `utf8`));

export default exe;
