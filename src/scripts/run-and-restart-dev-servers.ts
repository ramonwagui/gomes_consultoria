import { execSync, spawn } from "node:child_process";

const API_PORT = 3000;
const WEB_PORT = 5173;

const parsePidsFromNetstat = (port: number, output: string) => {
  const lines = output.split(/\r?\n/);
  const pids = new Set<number>();

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) {
      continue;
    }
    if (!normalized.includes(`:${port}`) || !normalized.includes("LISTENING")) {
      continue;
    }

    const parts = normalized.split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (!Number.isNaN(pid) && pid > 0) {
      pids.add(pid);
    }
  }

  return Array.from(pids);
};

const stopDevPorts = (ports: number[]) => {
  if (process.platform !== "win32") {
    return;
  }

  let netstatOutput = "";
  try {
    netstatOutput = execSync("netstat -ano -p tcp", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8"
    });
  } catch {
    return;
  }

  const pids = new Set<number>();
  for (const port of ports) {
    for (const pid of parsePidsFromNetstat(port, netstatOutput)) {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } catch {
      // Ignore kill failures (already stopped, access denied, etc.)
    }
  }
};

const startWindowsTerminal = (title: string, command: string) => {
  const child = spawn("cmd.exe", ["/c", "start", `\"${title}\"`, "cmd", "/k", command], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
};

const startDevServers = () => {
  if (process.platform === "win32") {
    startWindowsTerminal("GESTCONV360 API", "npm run dev");
    startWindowsTerminal("GESTCONV360 WEB", "npm run web:dev");
    return;
  }

  const api = spawn("npm", ["run", "dev"], { detached: true, stdio: "ignore" });
  api.unref();

  const web = spawn("npm", ["run", "web:dev"], { detached: true, stdio: "ignore" });
  web.unref();
};

const command = process.argv.slice(2).join(" ").trim();

try {
  if (command.length > 0) {
    execSync(command, { stdio: "inherit" });
  }
} finally {
  stopDevPorts([API_PORT, WEB_PORT]);
  startDevServers();
  console.log("Servidores reiniciados: API (3000) e WEB (5173).");
}
