/**
 * Operacje na aktorach: widok do sprawdzania warunków, kopie zaklęć z ksiąg, zapamiętywanie.
 *
 * Model zgodny z WFRP 4e i systemem: zaklęcie na karcie, ale niezapamiętane (`system.memorized`),
 * rzuca się z księgi (przy pechu system losuje tabelę "grimoire-miscast"). Dlatego księga noszona
 * przy sobie wpisuje na kartę niezapamiętane kopie zaklęć, które postać może z niej rzucać.
 * Zapamiętanie (ustawienie M) kosztuje PD wyliczane przez system jego własnym oknem.
 */
import { MODULE_ID, t, log } from "./constants.mjs";
import { COPY_FLAG, FORM_BOOK, entriesOfType, isGrimoire, readBook } from "./grimoire-data.mjs";
import { SPELL_TYPE, spellLores, spellSummary } from "./spell-data.mjs";
import { accessReason, evaluateReading, spellStatus } from "./requirements.mjs";
import { openEntries as openFor } from "./book-rules.mjs";
import { entryPages } from "./entry-types.mjs";
import { normalize } from "./names.mjs";

/** Czy zaklęcie jest kopią z księgi (nie liczy się jako znane). */
export function isCopy(item) {
  return Boolean(item?.flags?.[MODULE_ID]?.[COPY_FLAG]);
}

/** Uproszczony widok aktora dla scripts/requirements.mjs. */
export function actorView(actor) {
  const types = actor?.itemTypes ?? {};
  return {
    talents: (types.talent ?? []).map((i) => i.name),
    skills: (types.skill ?? []).map((i) => i.name),
    spells: (types.spell ?? []).filter((i) => !isCopy(i)).map((i) => ({
      name: i.name,
      lores: spellLores(i),
      memorized: Boolean(i.system?.memorized?.value)
    }))
  };
}

/** Czy księga jest "przy postaci" (posiadana, a gdy księga tego wymaga – także założona). */
export function isCarried(book) {
  if (!book?.actor) return false;
  return !readBook(book)?.requirements.carried || Boolean(book.system?.equipped?.value);
}

const OPEN_READING = Object.freeze({ readable: true, readWrite: true, language: true });

/**
 * Wszystko, czego typ wpisu potrzebuje o księdze i jej właścicielu.
 * @returns {{item: Item, book: object, form: string, actor: Actor|null, view: object|null,
 *   reading: object, carried: boolean, isGM: boolean}}
 */
export function bookContext(item) {
  const book = readBook(item);
  const actor = item.actor ?? null;
  const view = actor ? actorView(actor) : null;
  return {
    item,
    book,
    form: book.form,
    actor,
    actorId: actor?.id ?? null,
    view,
    reading: view ? evaluateReading(view, book) : OPEN_READING,
    carried: isCarried(item),
    isGM: game.user.isGM
  };
}

/** Wpisy księgi dostępne jej właścicielowi (bez stron zaszyfrowanych i zakazanych). */
export function openEntries(item) {
  return openFor(readBook(item), item.actor?.id ?? null, entryPages);
}

/** Czy właściciel może korzystać z księgi; `reason`: "carried", "readWrite", "language" albo null. */
export function bookAccess(item) {
  if (!item?.actor) return { accessible: true, reason: null };
  const { book, reading, carried } = bookContext(item);
  const reason = accessReason(reading, book.requirements, { carried: book.form !== FORM_BOOK || carried });
  return { accessible: reason === null, reason };
}

/** Kopie zaklęć z danej księgi na aktorze. */
export function copiesOf(actor, bookId) {
  return (actor?.itemTypes?.spell ?? []).filter((i) => i.flags?.[MODULE_ID]?.[COPY_FLAG]?.bookId === bookId);
}

/** Własne (nie z księgi) zaklęcie postaci o nazwie wpisu. */
export function ownedSpell(actor, entry) {
  return (actor?.itemTypes?.spell ?? []).find((i) => !isCopy(i) && normalize(i.name) === normalize(entry.data.name));
}

/** Statusy zaklęć księgi dla jej właściciela. */
export function entryStatuses(book) {
  const grimoire = readBook(book);
  const actor = book.actor;
  if (!grimoire || !actor) return [];
  const config = game.wfrp4e?.config ?? {};
  const loreLabel = (lore) => game.i18n.localize(config.magicLores?.[lore] ?? lore);
  const view = actorView(actor);
  const reading = evaluateReading(view, grimoire);
  return entriesOfType({ entries: openEntries(book) }, SPELL_TYPE).map((entry) => ({
    entry,
    status: spellStatus(view, spellSummary(entry.data), reading, grimoire.requirements, loreLabel)
  }));
}

/* -------------------------------------------- */
/*  Synchronizacja kopii z księgi                */
/* -------------------------------------------- */

const syncing = new Set();
const pending = new Set();

/**
 * Doprowadza kopie na karcie do stanu księgi: gdy księga jest przy postaci, każde zaklęcie,
 * które postać może z niej rzucić (status "castable"), jest na karcie jako niezapamiętana kopia;
 * pozostałe kopie z tej księgi są usuwane.
 */
export async function syncCopies(book) {
  const actor = book?.actor;
  if (!actor?.isOwner || !isGrimoire(book)) return;
  const key = book.uuid;
  if (syncing.has(key)) {
    pending.add(key);
    return;
  }
  syncing.add(key);
  try {
    const wanted = isCarried(book) ? entryStatuses(book).filter((s) => s.status === "castable").map((s) => s.entry) : [];
    const wantedIds = new Set(wanted.map((e) => e.id));
    const existing = copiesOf(actor, book.id);
    const existingIds = new Set(existing.map((i) => i.flags[MODULE_ID][COPY_FLAG].entryId));

    const toDelete = existing.filter((i) => !wantedIds.has(i.flags[MODULE_ID][COPY_FLAG].entryId)).map((i) => i.id);
    const toCreate = wanted.filter((e) => !existingIds.has(e.id)).map((entry) => {
      const data = foundry.utils.deepClone(entry.data);
      foundry.utils.setProperty(data, "system.memorized.value", false);
      foundry.utils.setProperty(data, `flags.${MODULE_ID}.${COPY_FLAG}`, { bookId: book.id, entryId: entry.id });
      return data;
    });

    if (toDelete.length) await actor.deleteEmbeddedDocuments("Item", toDelete);
    if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
  } catch (err) {
    log.error("Synchronizacja kopii z księgi", err);
  } finally {
    syncing.delete(key);
    if (pending.delete(key)) syncCopies(book);
  }
}

/** Synchronizuje wszystkie księgi aktora (np. po nauce talentu albo języka). */
export function syncActor(actor) {
  for (const item of actor?.items ?? []) if (isGrimoire(item)) syncCopies(item);
}

/** Usuwa wszystkie kopie z księgi (np. gdy księga opuszcza postać). */
export async function removeCopies(actor, bookId) {
  if (!actor?.isOwner) return;
  const ids = copiesOf(actor, bookId).map((i) => i.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
}

/* -------------------------------------------- */
/*  Rzucanie                                     */
/* -------------------------------------------- */

/** Zaklęcie na karcie odpowiadające wpisowi: kopia z księgi albo własne niezapamiętane. */
async function castableItem(book, entry) {
  const actor = book.actor;
  const copy = copiesOf(actor, book.id).find((i) => i.flags[MODULE_ID][COPY_FLAG].entryId === entry.id);
  if (copy) return copy;
  const owned = ownedSpell(actor, entry);
  if (owned) return owned;
  await syncCopies(book);
  return copiesOf(actor, book.id).find((i) => i.flags[MODULE_ID][COPY_FLAG].entryId === entry.id);
}

/** Rzut zaklęcia z księgi (albo splatanie w 4e). */
export async function castFromBook(book, entry, { channel = false } = {}) {
  const spell = await castableItem(book, entry);
  if (!spell) return;
  const actor = book.actor;
  const test = channel ? await actor.setupChannell(spell) : await actor.setupCast(spell);
  if (test?.roll) await test.roll();
}

/* -------------------------------------------- */
/*  Zapamiętanie zaklęcia (za zgodą MG)          */
/* -------------------------------------------- */

const MEMORIZE_QUERY = `${MODULE_ID}.memorizeSpell`;

/** Rejestracja zapytania – wykonuje je klient aktywnego MG. */
export function registerMemorizeQuery() {
  CONFIG.queries[MEMORIZE_QUERY] = async ({ bookUuid, entryId }, { user }) => {
    const book = await fromUuid(bookUuid);
    const entry = readBook(book)?.entries.find((s) => s.id === entryId);
    if (!book?.actor || !entry) return { ok: false };
    const approved = await foundry.applications.api.DialogV2.confirm({
      window: { title: t("Learn.Title") },
      content: `<p>${t("Learn.Confirm", {
        user: foundry.utils.escapeHTML(user?.name ?? ""),
        actor: foundry.utils.escapeHTML(book.actor.name),
        spell: foundry.utils.escapeHTML(entry.data.name),
        current: book.actor.system.details?.experience?.current ?? 0
      })}</p>`
    });
    if (!approved) return { ok: false, reason: "denied" };
    await memorize(book, entry);
    return { ok: true };
  };
}

/**
 * Zapamiętuje zaklęcie: kopia z księgi staje się własnym zaklęciem (albo powstaje nowe),
 * a ustawienie M uruchamia systemowe okno kosztu PD (Ok / Za darmo).
 */
async function memorize(book, entry) {
  const actor = book.actor;
  let spell = ownedSpell(actor, entry) ?? copiesOf(actor, book.id).find((i) => i.flags[MODULE_ID][COPY_FLAG].entryId === entry.id);
  if (!spell && spellLores(entry.data).includes("petty")) {
    // Magia prosta: system sam pyta o koszt PD przy dodaniu zaklęcia do postaci – jedno okno
    const data = foundry.utils.deepClone(entry.data);
    foundry.utils.setProperty(data, "system.memorized.value", true);
    await actor.createEmbeddedDocuments("Item", [data]);
  } else {
    if (!spell) {
      const data = foundry.utils.deepClone(entry.data);
      foundry.utils.setProperty(data, "system.memorized.value", false);
      [spell] = await actor.createEmbeddedDocuments("Item", [data]);
    }
    await spell.update({ "system.memorized.value": true, [`flags.${MODULE_ID}.-=${COPY_FLAG}`]: null });
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p>${t("Learn.Learned", { actor: foundry.utils.escapeHTML(actor.name), spell: foundry.utils.escapeHTML(entry.data.name) })}</p>`
  });
}

/** Prośba o zapamiętanie: MG zatwierdza, a koszt PD liczy system. */
export async function requestMemorize(book, entry) {
  const gm = game.users.activeGM;
  if (!gm) return ui.notifications.warn(t("Learn.NoGM"));
  const payload = { bookUuid: book.uuid, entryId: entry.id };
  try {
    const result = gm.isSelf
      ? await CONFIG.queries[MEMORIZE_QUERY](payload, { user: game.user })
      : await gm.query(MEMORIZE_QUERY, payload, { timeout: 5 * 60 * 1000 });
    if (result?.reason === "denied") ui.notifications.info(t("Learn.Denied"));
  } catch (err) {
    log.error("Zapamiętanie zaklęcia", err);
    ui.notifications.error(t("Learn.Failed"));
  }
}

/* -------------------------------------------- */
/*  Hooki                                        */
/* -------------------------------------------- */

const isMine = (userId) => userId === game.user.id;

export function registerCopyHooks() {
  // Księga trafia do postaci albo opuszcza ją
  Hooks.on("createItem", (item, _options, userId) => {
    if (!isMine(userId) || !item.actor) return;
    if (isGrimoire(item)) return syncCopies(item);
    if (["talent", "skill"].includes(item.type)) syncActor(item.actor);
  });

  Hooks.on("deleteItem", (item, _options, userId) => {
    if (!isMine(userId) || !item.actor) return;
    if (isGrimoire(item)) return removeCopies(item.actor, item.id);
    // Usunięcie talentu, umiejętności albo własnego zaklęcia może przywrócić kopię z księgi
    if (["talent", "skill"].includes(item.type) || (item.type === "spell" && !isCopy(item))) syncActor(item.actor);
  });

  Hooks.on("updateItem", (item, changes, _options, userId) => {
    if (!isMine(userId) || !item.actor) return;
    // Zmiana zawartości, języka albo noszenia księgi
    if (isGrimoire(item)) return syncCopies(item);
    // Gracz sam zapamiętał kopię na karcie – od teraz to jego zaklęcie, nie kopia z księgi
    if (isCopy(item) && foundry.utils.getProperty(changes, "system.memorized.value") === true) {
      item.update({ [`flags.${MODULE_ID}.-=${COPY_FLAG}`]: null });
    }
  });

  // Po zmianie ustawień MG odświeża kopie wszystkich postaci
  Hooks.on(`${MODULE_ID}.settingsChanged`, () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) syncActor(actor);
  });
}
