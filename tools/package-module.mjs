/**
 * Wypisuje listę plików, które trafiają do module.zip (jeden plik na linię).
 * Używane przez workflow wydania: `node tools/package-module.mjs | zip module.zip -@`
 *
 * Do paczki trafia tylko to, czego potrzebuje Foundry – bez narzędzi, testów i node_modules.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");

/** Pliki i katalogi wchodzące do paczki (jeśli istnieją). */
const INCLUDE = [
  "module.json",
  "LICENSE",
  "README.md",
  "README.pl.md",
  "CHANGELOG.md",
  "scripts",
  "styles",
  "lang",
  "templates",
  "packs",
  "assets",
  "data"
];

/** Pliki wykluczone wewnątrz dołączonych katalogów (bazy kompendiów w trakcie pracy). */
const EXCLUDE = [/(^|\/)LOCK$/, /(^|\/)LOG(\.old)?$/, /(^|\/)\.gitkeep$/];

function walk(path) {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((name) => walk(join(path, name)));
  }
  return [path];
}

const files = INCLUDE.filter((entry) => existsSync(join(root, entry)))
  .flatMap((entry) => walk(join(root, entry)))
  .map((file) => relative(root, file).replaceAll("\\", "/"))
  .filter((file) => !EXCLUDE.some((re) => re.test(file)));

process.stdout.write(files.join("\n") + "\n");
