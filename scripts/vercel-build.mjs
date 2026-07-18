import { spawn } from "node:child_process";

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `${command} stopped by ${signal}`
            : `${command} exited with code ${code}`,
        ),
      );
    });
  });

if (process.env.VERCEL_ENV === "production") {
  await run(process.execPath, ["scripts/migrate.mjs"]);
}

await run(process.execPath, ["node_modules/next/dist/bin/next", "build"]);
