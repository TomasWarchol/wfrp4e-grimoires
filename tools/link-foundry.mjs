/**
 * Podłącza katalog modułu do lokalnej instalacji Foundry (dowiązanie / junction),
 * żeby zmiany w kodzie były od razu widoczne po odświeżeniu świata.
 *
 * Użycie: npm run link            – katalog danych wykrywany automatycznie
 *         FOUNDRY_DATA="D:/Foundry/Data" npm run link
 */
import { existsSync, lstatSync, readFileSync, symlinkSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(".");
const { id } = JSON.parse(readFileSync(join(root, "module.json"), "utf8"));

function defaultDataPath() {
  switch (platform()) {
    case "win32":
      return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "FoundryVTT", "Data");
    case "darwin":
      return join(homedir(), "Library", "Application Support", "FoundryVTT", "Data");
    default:
      return join(homedir(), ".local", "share", "FoundryVTT", "Data");
  }
}

const dataPath = resolve(process.env.FOUNDRY_DATA ?? defaultDataPath());
const target = join(dataPath, "modules", id);

if (!existsSync(join(dataPath, "modules"))) {
  console.error(`✖ Nie znaleziono katalogu ${join(dataPath, "modules")}. Ustaw FOUNDRY_DATA.`);
  process.exit(1);
}

if (existsSync(target) || lstatExists(target)) {
  const stat = lstatSync(target);
  if (stat.isSymbolicLink()) {
    console.log(`✔ Dowiązanie już istnieje: ${target}`);
    process.exit(0);
  }
  console.error(`✖ ${target} istnieje i nie jest dowiązaniem – usuń lub przenieś go ręcznie.`);
  process.exit(1);
}

// "junction" na Windows nie wymaga uprawnień administratora
symlinkSync(root, target, platform() === "win32" ? "junction" : "dir");
console.log(`✔ Podłączono ${root}\n  → ${target}`);

function lstatExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}
