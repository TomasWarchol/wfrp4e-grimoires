/**
 * Integracja z kartą postaci i arkuszem przedmiotu:
 *  - osobny dział "Księgi zaklęć" w ekwipunku (hook systemu wfrp4e:constructInventory),
 *  - ikona otwarcia księgi w wierszu, "+" tworzący nową księgę,
 *  - znacznik kopii zaklęć z księgi w zakładce Magia,
 *  - przycisk w nagłówku arkusza książki: "Otwórz księgę" / "Uczyń księgą zaklęć".
 */
import { MODULE_ID, t } from "./constants.mjs";
import { FLAG_SCOPE, GRIMOIRE_FLAG, emptyGrimoire, isGrimoire } from "./grimoire-data.mjs";
import { isCopy } from "./actors.mjs";
import { getSettings } from "./settings.mjs";
import { GrimoireApp } from "./grimoire-app.mjs";

const SECTION = "grimoires";

/** Tworzy nową księgę zaklęć na aktorze i otwiera ją. */
export async function createGrimoire(actor) {
  const [book] = await actor.createEmbeddedDocuments("Item", [{
    type: "trapping",
    name: t("NewGrimoire"),
    img: "icons/sundries/books/book-embossed-gold-red.webp",
    system: { trappingType: { value: "booksAndDocuments" }, encumbrance: { value: 1 } },
    flags: { [FLAG_SCOPE]: { [GRIMOIRE_FLAG]: emptyGrimoire() } }
  }]);
  if (book) GrimoireApp.open(book);
  return book;
}

/** Zamienia zwykłą książkę (trapping) w księgę zaklęć. */
export async function makeGrimoire(item) {
  await item.update({
    "system.trappingType.value": "booksAndDocuments",
    [`flags.${FLAG_SCOPE}.${GRIMOIRE_FLAG}`]: emptyGrimoire()
  });
  GrimoireApp.open(item);
}

export function registerInventory() {
  // Dział w ekwipunku: księgi wyjęte z "Książek i dokumentów"
  Hooks.on("wfrp4e:constructInventory", (_sheet, categories, collapsed) => {
    const books = categories.booksAndDocuments?.items ?? [];
    const grimoires = books.filter(isGrimoire);
    if (categories.booksAndDocuments) categories.booksAndDocuments.items = books.filter((i) => !isGrimoire(i));
    const requireCarried = getSettings().requireCarried;
    categories[SECTION] = {
      label: t("Inventory.Section"),
      items: grimoires,
      toggle: requireCarried,
      toggleName: t("Inventory.Carried"),
      show: false,
      collapsed: collapsed?.[SECTION],
      dataType: "trapping"
    };
  });

  // Ikony w wierszach i obsługa "+" (render hook wszystkich arkuszy aktorów ApplicationV2)
  Hooks.on("renderActorSheetV2", (app, element) => decorateActorSheet(app, element));

  // Przycisk w nagłówku arkusza przedmiotu
  Hooks.on("getHeaderControlsDocumentSheetV2", (app, controls) => {
    const item = app.document;
    if (!(item instanceof Item) || item.type !== "trapping" || !item.isOwner) return;
    const grimoire = isGrimoire(item);
    const action = `${MODULE_ID}-grimoire`;
    app.options.actions[action] ??= () => (isGrimoire(item) ? GrimoireApp.open(item) : makeGrimoire(item));
    controls.unshift({
      action,
      icon: "fa-solid fa-book-journal-whills",
      label: grimoire ? t("Header.Open") : t("Header.Make")
    });
  });
}

function decorateActorSheet(app, element) {
  const actor = app.document;
  if (!actor || !element) return;

  for (const row of element.querySelectorAll(`.sheet-list.inventory.${SECTION} .list-row[data-uuid]`)) {
    if (row.querySelector(`.${MODULE_ID}-open`)) continue;
    const controls = row.querySelector(".list-controls");
    const button = document.createElement("a");
    button.className = `list-control ${MODULE_ID}-open`;
    button.dataset.tooltip = t("Inventory.Open");
    button.innerHTML = `<i class="fa-solid fa-book-open"></i>`;
    button.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const item = fromUuidSync(row.dataset.uuid);
      if (item) GrimoireApp.open(item);
    });
    (controls ?? row.querySelector(".row-content"))?.prepend(button);

    // Kliknięcie obrazka otwiera księgę zamiast domyślnej akcji przedmiotu
    const img = row.querySelector("img[data-action='useItem']");
    if (img) {
      img.removeAttribute("data-action");
      img.addEventListener("click", () => {
        const item = fromUuidSync(row.dataset.uuid);
        if (item) GrimoireApp.open(item);
      });
    }
  }

  // "+" w dziale ksiąg tworzy od razu księgę zaklęć
  const add = element.querySelector(`.sheet-list.inventory.${SECTION} [data-action='createItem']`);
  if (add) {
    add.removeAttribute("data-action");
    add.addEventListener("click", (ev) => {
      ev.preventDefault();
      createGrimoire(actor);
    });
  }

  // Znacznik kopii zaklęć z księgi
  for (const row of element.querySelectorAll(".list-row[data-uuid]")) {
    if (row.querySelector(`.${MODULE_ID}-copy`)) continue;
    const item = fromUuidSync(row.dataset.uuid);
    if (!isCopy(item)) continue;
    const label = row.querySelector(".list-name .label, .list-name a, .list-name");
    const icon = document.createElement("i");
    icon.className = `fa-solid fa-book-journal-whills ${MODULE_ID}-copy`;
    icon.dataset.tooltip = t("Inventory.CopyTooltip");
    label?.append(" ", icon);
  }
}
