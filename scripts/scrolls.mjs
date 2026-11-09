/**
 * Zwoje: rzucanie ze zwoju, zużycie i tworzenie.
 *
 * Rzut ze zwoju to zwykły test rzucania systemu dla zaklęcia, którego postać nie ma na karcie
 * (system zapisuje wtedy dane zaklęcia w teście, więc karta czatu – obrażenia, przeciążenie – działa).
 * Zaklęcie ze zwoju liczy się jako zapamiętane: PM bazowy.
 */
import { MODULE_ID, t, log } from "./constants.mjs";
import { FLAG_SCOPE, GRIMOIRE_FLAG, readBook, writeBook } from "./grimoire-data.mjs";
import { SPELL_TYPE, spellEntry } from "./spell-data.mjs";
import { emptyScroll, readScroll, scrollCount, scrollName, shouldConsume } from "./scroll-data.mjs";
import { bookContext } from "./actors.mjs";
import { typeOf } from "./entry-types.mjs";
import { getSettings } from "./settings.mjs";

/** Odczytanie zwoju i rzut zaklęcia; zużywa zwój zgodnie z ustawieniem. */
export async function castFromScroll(scroll) {
  const actor = scroll.actor;
  const entry = readScroll(scroll)?.entry;
  if (!actor || entry?.type !== SPELL_TYPE) return;
  if (!bookContext(scroll).reading.readable) return ui.notifications.warn(t("Scroll.CannotRead"));
  if (scrollCount(scroll) < 1) return ui.notifications.warn(t("Scroll.NoneLeft"));

  const spellData = foundry.utils.deepClone(entry.data);
  foundry.utils.setProperty(spellData, "system.memorized.value", true);
  // Test wymaga identyfikatora przedmiotu; zaklęcia nie ma na karcie, więc system odtworzy je
  // z danych zapisanych przez okno rzutu (itemData)
  spellData._id = foundry.utils.randomID();
  const spell = new Item.implementation(spellData, { parent: actor });

  let test;
  try {
    // Oznaczenie testu ze zwoju (dla innych modułów i makr)
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

/** Dane nowego, pustego zwoju. */
function scrollItemData() {
  return {
    type: "trapping",
    name: t("Scroll.NewScroll"),
    img: "icons/sundries/scrolls/scroll-bound-red-tan.webp",
    system: { trappingType: { value: "booksAndDocuments" }, encumbrance: { value: 0 }, quantity: { value: 1 } },
    flags: { [FLAG_SCOPE]: { [GRIMOIRE_FLAG]: emptyScroll() } }
  };
}

/** Tworzy pusty zwój na aktorze. */
export async function createScroll(actor) {
  const [scroll] = await actor.createEmbeddedDocuments("Item", [scrollItemData()]);
  return scroll;
}

/** Zamienia zwykłą książkę/dokument w zwój. */
export async function makeScroll(item) {
  await item.update({
    "system.trappingType.value": "booksAndDocuments",
    [`flags.${FLAG_SCOPE}.${GRIMOIRE_FLAG}`]: emptyScroll()
  });
}

/** Zapisuje wpis na zwoju (zastępuje poprzedni); opcjonalnie zmienia nazwę zwoju. */
export async function inscribeEntry(scroll, entry, { rename = true } = {}) {
  const update = writeBook({ ...(readBook(scroll) ?? emptyScroll()), entries: [entry] });
  if (rename) update.name = scrollName(t("Scroll.NamePattern"), typeOf(entry).name(entry));
  await scroll.update(update);
}

/** Zapisuje zaklęcie na zwoju (skrót dla makr). */
export function inscribeSpell(scroll, spell, options) {
  return inscribeEntry(scroll, spellEntry(spell.toObject(), { id: foundry.utils.randomID(), sourceUuid: spell.uuid }), options);
}
