/**
 * WFRP4e – Grimoires
 * Księgi zaklęć: osobny dział w ekwipunku i okno księgi ze spisem zaklęć.
 */

import { MODULE_ID, log } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { registerCopyHooks, registerMemorizeQuery } from "./actors.mjs";
import { createGrimoire, makeGrimoire, registerInventory } from "./inventory.mjs";
import { GrimoireApp } from "./grimoire-app.mjs";
import { isGrimoire, readGrimoire } from "./grimoire-data.mjs";

Hooks.once("init", () => {
  log.info("init");
  registerSettings();
  registerMemorizeQuery();
  registerInventory();
  registerCopyHooks();
  foundry.applications.handlebars.loadTemplates([
    `modules/${MODULE_ID}/templates/grimoire.hbs`,
    `modules/${MODULE_ID}/templates/chat-spell.hbs`
  ]);

  game.modules.get(MODULE_ID).api = {
    /** Otwiera okno księgi. */
    open: (book) => GrimoireApp.open(book),
    /** Tworzy nową księgę na aktorze. */
    create: (actor) => createGrimoire(actor),
    /** Zamienia książkę w księgę zaklęć. */
    make: (item) => makeGrimoire(item),
    isGrimoire,
    read: readGrimoire
  };
});

// Odświeżanie otwartych okien po zmianach księgi lub postaci
Hooks.on("updateItem", (item) => {
  if (isGrimoire(item)) GrimoireApp.refresh(item);
  else if (item.actor) GrimoireApp.refreshForActor(item.actor);
});
Hooks.on("createItem", (item) => item.actor && GrimoireApp.refreshForActor(item.actor));
Hooks.on("deleteItem", (item) => item.actor && GrimoireApp.refreshForActor(item.actor));
Hooks.on(`${MODULE_ID}.settingsChanged`, () => {
  for (const app of foundry.applications.instances.values()) if (app instanceof GrimoireApp) app.render();
});
