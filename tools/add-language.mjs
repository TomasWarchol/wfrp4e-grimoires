/**
 * Dodaje nowy język do modułu: tworzy lang/<kod>.json z angielskiego pliku bazowego
 * i dopisuje wpis do "languages" w module.json.
 *
 * Użycie: npm run lang:add -- <kod> "<Nazwa języka>"
 * Przykład: npm run lang:add -- de "Deutsch"
 *
 * Nowy plik zawiera angielskie teksty do przetłumaczenia. Tłumaczenie może być częściowe –
 * dla brakujących kluczy Foundry pokaże tekst angielski (walidator zgłosi je jako ostrzeżenia).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [code, name] = process.argv.slice(2);
const root = resolve(".");

if (!code || !name) {
  console.error('Użycie: npm run lang:add -- <kod> "<Nazwa języka>"   (np. de "Deutsch")');
  process.exit(1);
}
if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(code)) {
  console.error(`✖ Niepoprawny kod języka "${code}" – użyj kodu ISO, np. de, fr, es, pt-BR.`);
  process.exit(1);
}

const manifestPath = join(root, "module.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.languages ??= [];

if (manifest.languages.some((l) => l.lang === code)) {
  console.error(`✖ Język "${code}" jest już w module.json.`);
  process.exit(1);
}

const base = manifest.languages.find((l) => l.lang === "en");
if (!base) {
  console.error("✖ Brak angielskiego pliku bazowego (lang: en) w module.json.");
  process.exit(1);
}

const target = `lang/${code}.json`;
if (existsSync(join(root, target))) {
  console.error(`✖ Plik ${target} już istnieje.`);
  process.exit(1);
}

writeFileSync(join(root, target), readFileSync(join(root, base.path), "utf8"));
manifest.languages.push({ lang: code, name, path: target });
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`✔ Dodano język ${name} (${code}): ${target}
  Przetłumacz teksty w ${target} – nieprzetłumaczone klucze możesz też po prostu usunąć,
  Foundry pokaże wtedy tekst angielski. Potem: npm run check`);
