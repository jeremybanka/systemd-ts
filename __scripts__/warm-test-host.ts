import { closeTestHost, ensureTestHost } from "../packages/systemd-ts/src/test/host.ts";

const info = await ensureTestHost();
closeTestHost();
console.log(JSON.stringify(info));
