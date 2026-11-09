/**
 * Czynności na stronach księgi niezależne od rodzaju wpisu: odszyfrowywanie, czytanie stron
 * zakazanych i przepisywanie do innej księgi.
 */
import { t } from "./constants.mjs";
import { FORM_BOOK, addEntry, isGrimoire, readBook, writeBook } from "./grimoire-data.mjs";
import { CIPHERED, WARDED, applyDecode, copyOutcome, decodeNeeded, fits, markKnown, markRead } from "./book-rules.mjs";
import { entryPages, typeOf } from "./entry-types.mjs";
import { LANGUAGE, hasSpecialised, languageVariants, normalize } from "./names.mjs";

const { DialogV2 } = foundry.applications.api;

const CORRUPTION_KEYS = { minor: "CORRUPTION.Minor", moderate: "CORRUPTION.Moderate", major: "CORRUPTION.Major" };
const COPY_DIFFICULTY = "challenging";

export const corruptionLabel = (strength) => game.i18n.localize(CORRUPTION_KEYS[strength]);

const costProviders = [];

/**
 * Dokłada koszt przepisywania (np. atrament z alchemii).
 * @param {(args: {entry: object, pages: number, actor: Actor, item: Item}) =>
 *   ({label: string, available: boolean, consume: () => Promise<void>}|null)} provider
 */
export function registerCopyCost(provider) {
  costProviders.push(provider);
}

/** Test czytania: wskazana umiejętność, inaczej język księgi, a bez niego Inteligencja. */
async function rollReadingTest(ctx, { skill, difficulty, title }) {
  const { actor, book } = ctx;
  const context = { fields: { difficulty }, title, skipTargets: true };
  const skills = actor.itemTypes.skill;
  let test;
  if (skill?.trim()) {
    const named = skills.find((s) => normalize(s.name) === normalize(skill));
    if (!named) {
      ui.notifications.warn(t("Page.NeedsSkill", { skill }));
      return null;
    }
    test = await actor.setupSkill(named, context);
  } else {
    const language = skills.find((s) => hasSpecialised([s.name], LANGUAGE, languageVariants(book.language)));
    test = language ? await actor.setupSkill(language, context) : await actor.setupCharacteristic("int", context);
  }
  if (!test) return null;
  await test.roll();
  return test;
}

const outcomeOf = (test) => ({ success: Boolean(test.succeeded), sl: Number(test.result.SL) || 0, fumble: Boolean(test.result.fumble) });

async function decipher(item, entry, ctx) {
  const { cipher } = ctx.book;
  const test = await rollReadingTest(ctx, { skill: cipher.skill, difficulty: cipher.difficulty, title: t("Page.DecipherTitle", { book: item.name }) });
  if (!test) return;
  const needed = decodeNeeded(ctx.book, entryPages(entry));
  const { book, progress, lost, done } = applyDecode(readBook(item), ctx.actor.id, entry.id, outcomeOf(test), needed);
  await item.update(writeBook(book));
  if (done) ui.notifications.info(t("Page.Deciphered", { name: typeOf(entry).name(entry) }));
  else if (lost) ui.notifications.warn(t("Page.DecipherLost"));
  else ui.notifications.info(t("Page.DecipherProgress", { progress, needed }));
}

async function readForbidden(item, entry, ctx) {
  const strength = corruptionLabel(ctx.book.forbidden);
  const confirmed = await DialogV2.confirm({
    window: { title: t("Page.ReadForbidden") },
    content: `<p>${t("Page.ForbiddenConfirm", { strength: strength.toLocaleLowerCase() })}</p>`
  });
  if (!confirmed) return;
  const test = await ctx.actor.corruptionDialog(strength.toLocaleLowerCase());
  if (test) await item.update(writeBook(markRead(readBook(item), ctx.actor.id, entry.id)));
}

/** Księgi postaci, do których można przepisać wpis. */
function copyTargets(item, entry, ctx) {
  const type = typeOf(entry);
  return ctx.actor.items.filter((other) => {
    if (other.id === item.id || !isGrimoire(other)) return false;
    const book = readBook(other);
    return fits(book, entry, entryPages) && addEntry(book, entry, type.same).added;
  });
}

async function copyEntry(item, entry, ctx) {
  const type = typeOf(entry);
  const targets = copyTargets(item, entry, ctx);
  if (!targets.length) return ui.notifications.warn(t("Page.NoTarget"));
  const costs = costProviders.map((provider) => provider({ entry, pages: entryPages(entry), actor: ctx.actor, item })).filter(Boolean);
  const missing = costs.find((cost) => !cost.available);
  if (missing) return ui.notifications.warn(t("Page.NoMaterials", { cost: missing.label }));

  const escape = foundry.utils.escapeHTML;
  const options = targets.map((b) => `<option value="${b.id}">${escape(b.name)}</option>`).join("");
  const costLine = costs.length ? `<p>${t("Page.CopyCost", { cost: costs.map((c) => escape(c.label)).join(", ") })}</p>` : "";
  const targetId = await DialogV2.prompt({
    window: { title: t("Page.Copy") },
    content: `<div class="form-group"><label>${t("Page.CopyTarget")}</label><select name="target">${options}</select></div>${costLine}`,
    ok: { label: t("Page.Copy"), callback: (_event, button) => button.form.elements.target.value },
    rejectClose: false
  });
  const target = targetId ? ctx.actor.items.get(targetId) : null;
  if (!target) return;

  const test = await rollReadingTest(ctx, { difficulty: COPY_DIFFICULTY, title: t("Page.CopyTitle", { book: target.name }) });
  if (!test) return;
  for (const cost of costs) await cost.consume();

  const name = type.name(entry);
  const outcome = copyOutcome(outcomeOf(test));
  if (outcome === "ruined") return ui.notifications.warn(t("Page.CopyRuined", { name }));

  const fresh = { ...foundry.utils.deepClone(entry), id: foundry.utils.randomID(), flawed: Boolean(entry.flawed) || outcome === "flawed" };
  const copy = outcome === "flawed" && !entry.flawed && type.applyFlaw ? type.applyFlaw(fresh) : fresh;
  const { book } = addEntry(readBook(target), copy, type.same);
  await target.update(writeBook(markKnown(book, ctx.actor.id, copy, entryPages)));
  ui.notifications.info(t(copy.flawed ? "Page.CopiedFlawed" : "Page.Copied", { name, book: target.name }));
}

const PAGE_ACTIONS = { decipher, readForbidden, copyEntry };

/** Wykonuje czynność na stronie albo akcję należącą do typu wpisu. */
export function runEntryAction(actionId, item, entry, ctx) {
  const action = PAGE_ACTIONS[actionId];
  return action ? action(item, entry, ctx) : typeOf(entry).run(actionId, entry, ctx);
}

/** Przyciski strony zamkniętej. */
export function lockedActions(state, ctx) {
  if (!ctx.actor?.isOwner) return [];
  if (state === CIPHERED) return [{ id: "decipher", label: t("Page.Decipher"), icon: "fa-key", primary: true }];
  if (state === WARDED) return [{ id: "readForbidden", label: t("Page.ReadForbidden"), icon: "fa-skull", primary: true }];
  return [];
}

/** Przycisk przepisywania, gdy postać ma dokąd przepisać. */
export function copyAction(item, entry, status, ctx) {
  const type = typeOf(entry);
  if (!ctx.actor?.isOwner || ctx.form !== FORM_BOOK || type.id === "") return null;
  if (type.canCopy && !type.canCopy(entry, status, ctx)) return null;
  if (!ctx.actor.items.some((other) => other.id !== item.id && isGrimoire(other))) return null;
  return { id: "copyEntry", label: t("Page.Copy"), icon: "fa-pen-nib" };
}
