#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn, execSync } from "child_process";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const require = createRequire(import.meta.url);
const pkg = require(join(projectRoot, "package.json"));

const PORT = process.env.FORGE_PORT || 3333;

program
  .name("forge")
  .description("Local agent orchestration platform for Claude Code")
  .version(pkg.version);

program
  .command("start", { isDefault: true })
  .description("Start the Forge server (builds if needed, then serves)")
  .option("-p, --port <port>", "Port to run on", String(PORT))
  .action(async (options) => {
    const port = options.port;
    const distPath = join(projectRoot, "dist");

    // Build if dist/ doesn't exist
    if (!existsSync(distPath)) {
      const spinner = ora({
        text: chalk.dim("Building Forge..."),
        color: "yellow",
      }).start();

      try {
        execSync("npx vite build", {
          cwd: projectRoot,
          stdio: "pipe",
        });
        spinner.succeed(chalk.dim("Build complete"));
      } catch (err) {
        spinner.fail(chalk.red("Build failed"));
        console.error(err.stderr?.toString() || err.message);
        process.exit(1);
      }
    }

    // Start the server
    const serverPath = join(projectRoot, "server/index.js");
    const env = { ...process.env, FORGE_PORT: port, NODE_ENV: "production" };

    const server = spawn("node", [serverPath, "--serve"], {
      env,
      stdio: "inherit",
      cwd: projectRoot,
    });

    server.on("error", (err) => {
      console.error(chalk.red(`Failed to start server: ${err.message}`));
      process.exit(1);
    });

    // Give server a moment to start, then print the banner
    setTimeout(() => {
      console.log();
      console.log(chalk.bold("  🔥 Forge is running"));
      console.log();
      console.log(`     Local:  ${chalk.cyan(`http://localhost:${port}`)}`);
      console.log();
      console.log(chalk.dim("     Press Ctrl+C to stop"));
      console.log();
    }, 800);

    process.on("SIGINT", () => {
      server.kill();
      process.exit(0);
    });
  });

program
  .command("dev")
  .description("Start in dev mode (server + vite concurrently)")
  .option("-p, --port <port>", "Port to run on", String(PORT))
  .action(async (options) => {
    const port = options.port;

    console.log();
    console.log(chalk.bold("  🔥 Forge") + chalk.dim(" (dev mode)"));
    console.log();

    const env = { ...process.env, FORGE_PORT: port };

    const child = spawn(
      "npx",
      ["concurrently", "--kill-others", `"node server/index.js"`, `"vite"`],
      {
        env,
        stdio: "inherit",
        cwd: projectRoot,
        shell: true,
      }
    );

    child.on("error", (err) => {
      console.error(chalk.red(`Failed to start dev server: ${err.message}`));
      process.exit(1);
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });

    process.on("SIGINT", () => {
      child.kill();
      process.exit(0);
    });
  });

// Preserve existing install/uninstall commands if the module exists
try {
  const { installCommand, uninstallCommand } = await import(
    "../src/cli/install.js"
  );

  program
    .command("install")
    .description("Install Forge bridge hooks into Claude Code")
    .option("-g, --global", "Install into ~/.claude/settings.json (all projects)")
    .action(installCommand);

  program
    .command("uninstall")
    .description("Remove Forge bridge hooks from Claude Code")
    .option("-g, --global", "Remove from ~/.claude/settings.json")
    .action(uninstallCommand);
} catch {
  // install/uninstall commands not available
}

program.parse();
