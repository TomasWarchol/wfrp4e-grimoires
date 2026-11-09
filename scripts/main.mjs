/**
 * WFRP4e – Grimoires
 * Księgi i zwoje: osobne działy w ekwipunku, okno księgi ze spisem treści i typy wpisów.
 */

import { MODULE_ID, log } from "./constants.mjs";
import { applyRequirementDefaults, registerSettings } from "./settings.mjs";
import { registerCopyHooks, registerMemorizeQuery } from "./actors.mjs";
import { createGrimoire, makeGrimoire, registerInventory } from "./inventory.mjs";
import { GrimoireApp } from "./grimoire-app.mjs";
import { ScrollApp } from "./scroll-app.mjs";
import { readScroll } from "./scroll-data.mjs";
import { castFromScroll, createScroll, inscribeEntry } from "./scrolls.mjs";
import { isBook, isGrimoire, isScroll, readBook } from "./grimoire-data.mjs";
import { getEntryType, registerEntryType } from "./entry-types.mjs";
import { spellType } from "./spell-type.mjs";
import { addAliases } from "./names.mjs";

registerEntryType(spellType);

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
    /** Zamienia książkę w księgę. */
    make: (item) => makeGrimoire(item),
    isBook,
    isGrimoire,
    /** { form, language, cover, requirements, entries: [{ id, type, sourceUuid, data }] } */
    read: readBook,
    /** Dokłada nowy typ wpisów ksiąg (patrz scripts/entry-types.mjs). */
    registerEntryType,
    getEntryType,
    scrolls: {
      /** Otwiera okno zwoju. */
      open: (scroll) => ScrollApp.open(scroll),
      /** Tworzy pusty zwój na aktorze. */
      create: (actor) => createScroll(actor),
      /** Odczytuje zwój i rzuca zaklęcie (zużywa zwój). */
      cast: (scroll) => castFromScroll(scroll),
      /** Zapisuje wpis na zwoju. */
      inscribe: (scroll, entry, options) => inscribeEntry(scroll, entry, options),
      isScroll,
      read: readScroll
    }
  };
});

Hooks.once("setup", applyRequirementDefaults);

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
// Zmiana postaci odświeża jej okna
Hooks.on("updateActor", (actor) => {
  GrimoireApp.refreshForActor(actor);
  ScrollApp.refreshForActor(actor);
});
Hooks.on(`${MODULE_ID}.settingsChanged`, () => {
  for (const app of foundry.applications.instances.values()) if (app instanceof GrimoireApp || app instanceof ScrollApp) app.render();
});
