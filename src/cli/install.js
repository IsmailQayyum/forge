import fs from "fs";
import path from "path";
import os from "os";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK_SCRIPT = path.resolve(__dirname, "../../hooks/forge-bridge.py");

export function installCommand(options) {
  console.log();
  console.log(chalk.bold("  Installing Forge bridge into Claude Code"));
  console.log();

  const isGlobal = options.global;
  const settingsPath = isGlobal
    ? path.join(os.homedir(), ".claude", "settings.json")
    : path.join(process.cwd(), ".claude", "settings.json");

  // Read existing settings
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch {
      console.log(chalk.yellow("  Warning: Could not parse existing settings.json, creating fresh."));
    }
  }

  // Ensure hooks structure
  if (!settings.hooks) settings.hooks = {};

  const hookCommand = `python3 "${HOOK_SCRIPT}"`;

  // Install PostToolUse hook
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
  const hasPost = settings.hooks.PostToolUse.some((h) =>
    JSON.stringify(h).includes("forge-bridge")
  );
  if (!hasPost) {
    settings.hooks.PostToolUse.push({
      matcher: "",
      hooks: [{ type: "command", command: hookCommand }],
    });
    console.log(chalk.green("  ✓ PostToolUse hook installed"));
  } else {
    console.log(chalk.dim("  ○ PostToolUse hook already installed"));
  }

  // Install PreToolUse hook (for pending message check)
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
  const hasPre = settings.hooks.PreToolUse.some((h) =>
    JSON.stringify(h).includes("forge-bridge")
  );
  if (!hasPre) {
    settings.hooks.PreToolUse.push({
      matcher: "",
      hooks: [{ type: "command", command: hookCommand }],
    });
    console.log(chalk.green("  ✓ PreToolUse hook installed"));
  } else {
    console.log(chalk.dim("  ○ PreToolUse hook already installed"));
  }

  // Install Notification hook
  if (!settings.hooks.Notification) settings.hooks.Notification = [];
  const hasNotif = settings.hooks.Notification.some((h) =>
    JSON.stringify(h).includes("forge-bridge")
  );
  if (!hasNotif) {
    settings.hooks.Notification.push({
      matcher: "",
      hooks: [{ type: "command", command: hookCommand }],
    });
    console.log(chalk.green("  ✓ Notification hook installed"));
  } else {
    console.log(chalk.dim("  ○ Notification hook already installed"));
  }

  // Install Stop hook
  if (!settings.hooks.Stop) settings.hooks.Stop = [];
  const hasStop = settings.hooks.Stop.some((h) =>
    JSON.stringify(h).includes("forge-bridge")
  );
  if (!hasStop) {
    settings.hooks.Stop.push({
      matcher: "",
      hooks: [{ type: "command", command: hookCommand }],
    });
    console.log(chalk.green("  ✓ Stop hook installed"));
  } else {
    console.log(chalk.dim("  ○ Stop hook already installed"));
  }

  // Write settings
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

  console.log();
  console.log(chalk.green("  ✓ Forge bridge installed into " + chalk.bold(settingsPath)));
  console.log();
  console.log("  " + chalk.bold("What's connected:"));
  console.log("  " + chalk.dim("• Tool calls sent to Forge in real-time"));
  console.log("  " + chalk.dim("• Notifications forwarded to Forge messenger"));
  console.log("  " + chalk.dim("• Pending messages checked before each tool use"));
  console.log("  " + chalk.dim("• Session end events reported"));
  console.log();
  console.log("  " + chalk.bold("Next:") + chalk.dim(" Start Forge with ") + chalk.cyan("npx forge"));
  console.log();
}

export function uninstallCommand(options) {
  const isGlobal = options.global;
  const settingsPath = isGlobal
    ? path.join(os.homedir(), ".claude", "settings.json")
    : path.join(process.cwd(), ".claude", "settings.json");

  if (!fs.existsSync(settingsPath)) {
    console.log(chalk.dim("\n  No settings.json found — nothing to uninstall.\n"));
    return;
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch {
    console.log(chalk.red("\n  Could not parse settings.json\n"));
    return;
  }

  let removed = 0;
  for (const hookType of ["PreToolUse", "PostToolUse", "Notification", "Stop"]) {
    if (settings.hooks?.[hookType]) {
      const before = settings.hooks[hookType].length;
      settings.hooks[hookType] = settings.hooks[hookType].filter(
        (h) => !JSON.stringify(h).includes("forge-bridge")
      );
      removed += before - settings.hooks[hookType].length;
    }
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log(chalk.green(`\n  ✓ Removed ${removed} Forge hooks from ${settingsPath}\n`));
}
