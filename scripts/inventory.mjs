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
import { ScrollApp } from "./scroll-app.mjs";
import { isScroll } from "./scroll-data.mjs";
import { createScroll, makeScroll } from "./scrolls.mjs";

const SECTION = "grimoires";
const SCROLL_SECTION = "scrolls";

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
    const scrolls = books.filter(isScroll);
    if (categories.booksAndDocuments) categories.booksAndDocuments.items = books.filter((i) => !isGrimoire(i) && !isScroll(i));
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
    categories[SCROLL_SECTION] = {
      label: t("Inventory.ScrollSection"),
      items: scrolls,
      show: false,
      collapsed: collapsed?.[SCROLL_SECTION],
      dataType: "trapping"
    };
  });

  // Ikony w wierszach i obsługa "+" (render hook wszystkich arkuszy aktorów ApplicationV2)
  Hooks.on("renderActorSheetV2", (app, element) => decorateActorSheet(app, element));

  // Przycisk w nagłówku arkusza przedmiotu
  Hooks.on("getHeaderControlsDocumentSheetV2", (app, controls) => {
    const item = app.document;
    if (!(item instanceof Item) || item.type !== "trapping" || !item.isOwner) return;
    const grimoireAction = `${MODULE_ID}-grimoire`;
    const scrollAction = `${MODULE_ID}-scroll`;
    app.options.actions[grimoireAction] ??= () => (isGrimoire(item) ? GrimoireApp.open(item) : makeGrimoire(item));
    app.options.actions[scrollAction] ??= async () => {
      if (!isScroll(item)) await makeScroll(item);
      ScrollApp.open(item);
    };
    if (isScroll(item)) {
      controls.unshift({ action: scrollAction, icon: "fa-solid fa-scroll", label: t("Header.OpenScroll") });
    } else if (isGrimoire(item)) {
      controls.unshift({ action: grimoireAction, icon: "fa-solid fa-book-journal-whills", label: t("Header.Open") });
    } else {
      controls.unshift(
        { action: scrollAction, icon: "fa-solid fa-scroll", label: t("Header.MakeScroll") },
        { action: grimoireAction, icon: "fa-solid fa-book-journal-whills", label: t("Header.Make") }
      );
    }
  });
}

function decorateActorSheet(app, element) {
  const actor = app.document;
  if (!actor || !element) return;

  decorateSection(element, SECTION, "fa-book-open", t("Inventory.Open"), (item) => GrimoireApp.open(item), () => createGrimoire(actor));
  decorateSection(element, SCROLL_SECTION, "fa-scroll", t("Inventory.OpenScroll"), (item) => ScrollApp.open(item), async () => {
    const scroll = await createScroll(actor);
    if (scroll) ScrollApp.open(scroll);
  });

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

/** Ikona otwarcia w wierszach działu, obrazek otwiera okno, "+" tworzy nowy przedmiot. */
function decorateSection(element, section, icon, tooltip, open, create) {
  for (const row of element.querySelectorAll(`.sheet-list.inventory.${section} .list-row[data-uuid]`)) {
    if (row.querySelector(`.${MODULE_ID}-open`)) continue;
    const controls = row.querySelector(".list-controls");
    const button = document.createElement("a");
    button.className = `list-control ${MODULE_ID}-open`;
    button.dataset.tooltip = tooltip;
    button.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    button.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const item = fromUuidSync(row.dataset.uuid);
      if (item) open(item);
    });
    (controls ?? row.querySelector(".row-content"))?.prepend(button);

    const img = row.querySelector("img[data-action='useItem']");
    if (img) {
      img.removeAttribute("data-action");
      img.addEventListener("click", () => {
        const item = fromUuidSync(row.dataset.uuid);
        if (item) open(item);
      });
    }
  }

  const add = element.querySelector(`.sheet-list.inventory.${section} [data-action='createItem']`);
  if (add) {
    add.removeAttribute("data-action");
    add.addEventListener("click", (ev) => {
      ev.preventDefault();
      create();
    });
  }
}
