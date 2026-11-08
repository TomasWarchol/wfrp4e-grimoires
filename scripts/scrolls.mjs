/**
 * Zwoje magiczne: rzucanie ze zwoju, zużycie, tworzenie i losowy zwój.
 *
 * Rzut ze zwoju to zwykły test rzucania systemu dla zaklęcia, którego postać nie ma na karcie
 * (system zapisuje wtedy dane zaklęcia w teście, więc karta czatu – obrażenia, przeciążenie – działa).
 * Zaklęcie ze zwoju liczy się jako zapamiętane: PM bazowy.
 */
import { MODULE_ID, t, log } from "./constants.mjs";
import { FLAG_SCOPE, spellEntry, spellLores } from "./grimoire-data.mjs";
import { SCROLL_FLAG, emptyScroll, pickRandomSpell, readScroll, scrollCount, scrollName, shouldConsume } from "./scroll-data.mjs";
import { actorView } from "./actors.mjs";
import { evaluateReading } from "./requirements.mjs";
import { getSettings } from "./settings.mjs";

/** Czy postać może odczytać zwój. */
export function scrollReading(scroll) {
  const data = readScroll(scroll);
  if (!data || !scroll.actor) return { readable: true, readWrite: true, language: true };
  return evaluateReading(actorView(scroll.actor), data, getSettings());
}

/** Odczytanie zwoju i rzut zaklęcia; zużywa zwój zgodnie z ustawieniem. */
export async function castFromScroll(scroll) {
  const actor = scroll.actor;
  const data = readScroll(scroll);
  if (!actor || !data?.spell) return;
  if (!scrollReading(scroll).readable) return ui.notifications.warn(t("Scroll.CannotRead"));
  if (scrollCount(scroll) < 1) return ui.notifications.warn(t("Scroll.NoneLeft"));

  const spellData = foundry.utils.deepClone(data.spell.data);
  foundry.utils.setProperty(spellData, "system.memorized.value", true);
  const spell = new Item.implementation(spellData, { parent: actor });

  let test;
  try {
    // Oznaczenie testu ze zwoju (koszt zmęczenia rzucaniem liczony jak dla zwoju)
    test = await actor.setupCast(spell, { appendTitle: ` – ${t("Scroll.FromScroll")}`, [MODULE_ID]: { scroll: true } });
    if (test?.roll) await test.roll();
  } catch (err) {
    log.error("Rzut ze zwoju", err);
    return ui.notifications.error(t("Scroll.Failed"));
  }

  if (shouldConsume(test, getSettings())) await consumeScroll(scroll);
}

/** Zmniejsza liczbę zwojów o 1; ostatni zwój znika. */
export async function consumeScroll(scroll) {
  const count = scrollCount(scroll);
  if (count <= 1) {
    await scroll.delete();
    ui.notifications.info(t("Scroll.Consumed", { scroll: scroll.name }));
  } else {
    await scroll.update({ "system.quantity.value": count - 1 });
  }
}

/** Dane nowego zwoju (opcjonalnie od razu z zaklęciem). */
function scrollItemData(spell = null) {
  const flag = emptyScroll();
  let name = t("Scroll.NewScroll");
  if (spell) {
    flag.spell = spellEntry(spell.toObject(), { id: foundry.utils.randomID(), sourceUuid: spell.uuid });
    name = scrollName(t("Scroll.NamePattern"), spell.name);
  }
  return {
    type: "trapping",
    name,
    img: "icons/sundries/scrolls/scroll-bound-red-tan.webp",
    system: { trappingType: { value: "booksAndDocuments" }, encumbrance: { value: 0 }, quantity: { value: 1 } },
    flags: { [FLAG_SCOPE]: { [SCROLL_FLAG]: flag } }
  };
}

/** Tworzy pusty zwój na aktorze. */
export async function createScroll(actor) {
  const [scroll] = await actor.createEmbeddedDocuments("Item", [scrollItemData()]);
  return scroll;
}

/** Zamienia zwykłą książkę/dokument w zwój magiczny. */
export async function makeScroll(item) {
  await item.update({
    "system.trappingType.value": "booksAndDocuments",
    [`flags.${FLAG_SCOPE}.${SCROLL_FLAG}`]: emptyScroll()
  });
}

/** Zapisuje zaklęcie na zwoju (zastępuje poprzednie); opcjonalnie zmienia nazwę zwoju. */
export async function inscribeSpell(scroll, spell, { rename = true } = {}) {
  const current = readScroll(scroll) ?? emptyScroll();
  const update = {
    [`flags.${FLAG_SCOPE}.${SCROLL_FLAG}`]: {
      ...current,
      spell: spellEntry(spell.toObject(), { id: foundry.utils.randomID(), sourceUuid: spell.uuid })
    }
  };
  if (rename) update.name = scrollName(t("Scroll.NamePattern"), spell.name);
  await scroll.update(update);
}

/**
 * Losowy zwój z zaklęć w kompendiach (bez magii prostej).
 * @param {{lore?: string, maxCN?: number, actor?: Actor}} options
 * @returns {Promise<Item|null>} utworzony zwój (u aktora albo w katalogu przedmiotów)
 */
export async function randomScroll({ lore, maxCN, actor } = {}) {
  const candidates = [];
  for (const pack of game.packs.filter((p) => p.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["type", "system.lore.value", "system.cn.value"] });
    for (const e of index) {
      if (e.type !== "spell") continue;
      candidates.push({ uuid: e.uuid, name: e.name, lores: [e.system?.lore?.value].flat().filter(Boolean), cn: Number(e.system?.cn?.value ?? 0) });
    }
  }
  const picked = pickRandomSpell(candidates, { lore, maxCN });
  if (!picked) {
    ui.notifications.warn(t("Scroll.NoSpellFound"));
    return null;
  }
  const spell = await fromUuid(picked.uuid);
  const data = scrollItemData(spell);
  const [created] = actor
    ? await actor.createEmbeddedDocuments("Item", [data])
    : await Item.implementation.createDocuments([data]);
  log.info(`losowy zwój: ${spell.name} (${spellLores(spell).join(", ")}, PM ${spell.system?.cn?.value})`);
  return created ?? null;
}

