import { closeTestHost, ensureTestHost } from "../packages/systemd-ts/src/testing/host.ts";

const info = await ensureTestHost();
closeTestHost();
console.log(JSON.stringify(info));
