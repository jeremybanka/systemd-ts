import { closeTestHost, ensureTestHost } from "../src/test/host.ts";

const info = await ensureTestHost();
closeTestHost();
console.log(JSON.stringify(info));
