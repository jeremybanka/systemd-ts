import { ensureTestHost } from "../packages/systemd-ts/src/testing/host.ts";

const info = await ensureTestHost();
console.log(JSON.stringify(info));
