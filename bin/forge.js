#!/usr/bin/env node
import { program } from "commander";
import open from "open";
import chalk from "chalk";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require(join(__dirname, "../package.json"));

const PORT = process.env.FORGE_PORT || 3333;

program
  .name("forge")
  .description("Local agent orchestration platform for Claude Code")
  .version(pkg.version);

program
  .command("start", { isDefault: true })
  .description("Start the Forge server and open the UI")
  .option("-p, --port <port>", "Port to run on", "3333")
  .option("--no-open", "Don't auto-open the browser")
  .action(async (options) => {
    console.log();
    console.log(chalk.bold("  🔥 Forge"));
    console.log(chalk.dim(`  Local agent orchestration for Claude Code\n`));

    const serverPath = join(__dirname, "../server/index.js");
    const env = { ...process.env, FORGE_PORT: options.port, NODE_ENV: "production" };

    const server = spawn("node", [serverPath, "--serve"], {
      env,
      stdio: "inherit",
    });

    server.on("error", (err) => {
      console.error(chalk.red(`  Failed to start server: ${err.message}`));
      process.exit(1);
    });

    // Give server a moment to start
    setTimeout(() => {
      const url = `http://localhost:${options.port}`;
      console.log(chalk.green(`  ✓ Running at ${chalk.bold(url)}`));
      console.log(chalk.dim("  Press Ctrl+C to stop\n"));

      if (options.open !== false) {
        open(url);
      }
    }, 800);

    process.on("SIGINT", () => {
      server.kill();
      process.exit(0);
    });
  });

program.parse();
