/**
 * Sprawdza moduł przed wydaniem:
 *  - module.json: wymagane pola, wersja semver, istnienie plików esmodules/styles/languages,
 *  - pliki tłumaczeń: poprawny JSON i ten sam zestaw kluczy co lang/en.json.
 *
 * Użycie: node tools/validate-module.mjs [katalog-modułu]
 * Kod wyjścia 1 przy błędach.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const errors = [];
const warnings = [];

function readJson(relPath) {
  const full = join(root, relPath);
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch (err) {
    errors.push(`${relPath}: ${err.code === "ENOENT" ? "brak pliku" : err.message}`);
    return null;
  }
}

/** Spłaszcza zagnieżdżony obiekt tłumaczeń do listy kluczy "A.B.C". */
function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" ? flattenKeys(value, path) : [path];
  });
}

const manifest = readJson("module.json");
if (manifest) {
  // Znacznik składany z części, żeby generator modułów go nie podmienił
  const TEMPLATE_TOKEN = ["__MODULE", "_"].join("");
  const isTemplate = manifest.id === `${TEMPLATE_TOKEN}ID__`;

  for (const field of ["id", "title", "version", "compatibility", "esmodules", "languages"]) {
    if (!(field in manifest)) errors.push(`module.json: brak pola "${field}"`);
  }
  if (manifest.version && !/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(manifest.version)) {
    errors.push(`module.json: wersja "${manifest.version}" nie jest w formacie semver`);
  }
  if (!isTemplate && JSON.stringify(manifest).includes(TEMPLATE_TOKEN)) {
    errors.push("module.json: zostały niepodmienione znaczniki szablonu (__MODULE_...__)");
  }

  for (const file of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []).map((s) => s.src ?? s)]) {
    if (!existsSync(join(root, file))) errors.push(`module.json: plik "${file}" nie istnieje`);
  }

  const languages = manifest.languages ?? [];
  const base = languages.find((l) => l.lang === "en");
  if (!base) warnings.push("module.json: brak języka angielskiego (en) jako bazy tłumaczeń");

  const baseData = base ? readJson(base.path) : null;
  const baseKeys = baseData ? new Set(flattenKeys(baseData)) : null;

  for (const lang of languages) {
    if (lang === base) continue;
    const data = readJson(lang.path);
    if (!data || !baseKeys) continue;
    const keys = new Set(flattenKeys(data));
    const missing = [...baseKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !baseKeys.has(k));
    if (missing.length) errors.push(`${lang.path}: brak ${missing.length} kluczy: ${missing.join(", ")}`);
    if (extra.length) warnings.push(`${lang.path}: nadmiarowe klucze: ${extra.join(", ")}`);
  }
}

for (const w of warnings) console.warn(`⚠ ${w}`);
for (const e of errors) console.error(`✖ ${e}`);
if (errors.length) {
  console.error(`\nWalidacja nieudana: ${errors.length} błąd(ów).`);
  process.exit(1);
}
console.log(`✔ Moduł poprawny${warnings.length ? ` (${warnings.length} ostrzeżeń)` : ""}.`);
