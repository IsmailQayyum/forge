import fs from "fs";
import path from "path";
import os from "os";

const STORE_PATH = path.join(os.homedir(), ".claude", "forge", "agents.json");

function load() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    }
  } catch {}
  return { architectures: [], active: null };
}

function save(data) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export const agentStore = {
  getAll() {
    return load();
  },

  saveArchitecture(arch) {
    const data = load();
    const existing = data.architectures.findIndex((a) => a.id === arch.id);
    if (existing >= 0) {
      data.architectures[existing] = { ...arch, updatedAt: Date.now() };
    } else {
      data.architectures.push({ ...arch, createdAt: Date.now(), updatedAt: Date.now() });
    }
    save(data);
    return arch;
  },

  deleteArchitecture(id) {
    const data = load();
    data.architectures = data.architectures.filter((a) => a.id !== id);
    if (data.active === id) data.active = null;
    save(data);
  },

  setActive(id) {
    const data = load();
    data.active = id;
    save(data);
  },

  getById(id) {
    const data = load();
    return data.architectures.find((a) => a.id === id) || null;
  },
};
