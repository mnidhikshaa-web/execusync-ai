import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const api = spawn(process.execPath, ["src/api-server.mjs"], { cwd: root, stdio: "inherit" });
const web = spawn(npm, ["run", "dev", "--", "--host", "127.0.0.1"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
function stop() {
  api.kill();
  web.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
api.on("exit", (code) => {
  if (code !== 0 && code !== null) process.exitCode = code;
  web.kill();
});
web.on("exit", (code) => {
  if (code !== 0 && code !== null) process.exitCode = code;
  api.kill();
});
