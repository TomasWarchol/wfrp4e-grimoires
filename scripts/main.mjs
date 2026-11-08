/**
 * WFRP4e – Grimoires
 * Księgi zaklęć: osobny dział w ekwipunku i okno księgi ze spisem zaklęć.
 */

import { MODULE_ID, log } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { registerCopyHooks, registerMemorizeQuery } from "./actors.mjs";
import { createGrimoire, makeGrimoire, registerInventory } from "./inventory.mjs";
import { GrimoireApp } from "./grimoire-app.mjs";
import { ScrollApp } from "./scroll-app.mjs";
import { isScroll, readScroll } from "./scroll-data.mjs";
import { castFromScroll, createScroll, randomScroll } from "./scrolls.mjs";
import { isGrimoire, readGrimoire } from "./grimoire-data.mjs";
import { addAliases } from "./names.mjs";
import { getEndurance, registerEnduranceHooks, restEndurance, setEndurance } from "./endurance.mjs";

// Warianty nazw talentów i języków z plików tłumaczeń: angielskiego (zapasowego) i aktywnego
Hooks.once("i18nInit", () => {
  addAliases(foundry.utils.getProperty(game.i18n._fallback ?? {}, "WFRP4E_GRIMOIRE.Aliases"));
  addAliases(foundry.utils.getProperty(game.i18n.translations ?? {}, "WFRP4E_GRIMOIRE.Aliases"));
});

Hooks.once("init", () => {
  log.info("init");
  registerSettings();
  registerMemorizeQuery();
  registerInventory();
  registerCopyHooks();
  registerEnduranceHooks();
  foundry.applications.handlebars.loadTemplates([
    `modules/${MODULE_ID}/templates/grimoire.hbs`,
    `modules/${MODULE_ID}/templates/chat-spell.hbs`,
    `modules/${MODULE_ID}/templates/scroll.hbs`
  ]);

  game.modules.get(MODULE_ID).api = {
    /** Otwiera okno księgi. */
    open: (book) => GrimoireApp.open(book),
    /** Tworzy nową księgę na aktorze. */
    create: (actor) => createGrimoire(actor),
    /** Zamienia książkę w księgę zaklęć. */
    make: (item) => makeGrimoire(item),
    isGrimoire,
    read: readGrimoire,
    scrolls: {
      /** Otwiera okno zwoju. */
      open: (scroll) => ScrollApp.open(scroll),
      /** Tworzy pusty zwój na aktorze. */
      create: (actor) => createScroll(actor),
      /** Odczytuje zwój i rzuca zaklęcie (zużywa zwój). */
      cast: (scroll) => castFromScroll(scroll),
      /** Losowy zwój: { lore, maxCN, actor } – bez aktora trafia do katalogu przedmiotów. */
      random: (options) => randomScroll(options),
      isScroll,
      read: readScroll
    },
    endurance: {
      /** { value, max, display } – Wytrzymałość Magiczna aktora. */
      get: (actor) => getEndurance(actor),
      set: (actor, value) => setEndurance(actor, value),
      /** Odpoczynek: WM do maksimum. */
      rest: (actor) => restEndurance(actor)
    }
  };
});

// Odświeżanie otwartych okien po zmianach księgi lub postaci
Hooks.on("updateItem", (item) => {
  if (isGrimoire(item)) GrimoireApp.refresh(item);
  else if (isScroll(item)) ScrollApp.refresh(item);
  else if (item.actor) {
    GrimoireApp.refreshForActor(item.actor);
    ScrollApp.refreshForActor(item.actor);
  }
});
Hooks.on("createItem", (item) => {
  if (!item.actor) return;
  GrimoireApp.refreshForActor(item.actor);
  ScrollApp.refreshForActor(item.actor);
});
Hooks.on("deleteItem", (item) => {
  if (isScroll(item)) ScrollApp.closeFor(item);
  if (!item.actor) return;
  GrimoireApp.refreshForActor(item.actor);
  ScrollApp.refreshForActor(item.actor);
});
// Zmiana postaci (np. Wytrzymałość Magiczna) odświeża jej okna
Hooks.on("updateActor", (actor) => {
  GrimoireApp.refreshForActor(actor);
  ScrollApp.refreshForActor(actor);
});
Hooks.on(`${MODULE_ID}.settingsChanged`, () => {
  for (const app of foundry.applications.instances.values()) if (app instanceof GrimoireApp || app instanceof ScrollApp) app.render();
});
