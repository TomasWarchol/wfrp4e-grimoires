/**
 * Typ wpisu "zaklęcie": status, szczegóły i akcje zaklęcia w księdze albo na zwoju.
 */
import { I18N, MODULE_ID, t } from "./constants.mjs";
import { getEdition } from "./edition.mjs";
import { FORM_SCROLL } from "./grimoire-data.mjs";
import { FROM_BOOK_STATUSES, SPELL_TYPE, effectiveCN, sameSpell, spellEntry, spellLores, spellSummary } from "./spell-data.mjs";
import { spellStatus } from "./requirements.mjs";
import { castFromBook, requestMemorize } from "./actors.mjs";
import { castFromScroll } from "./scrolls.mjs";
import { scrollCount } from "./scroll-data.mjs";
import { getSettings } from "./settings.mjs";

const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;

const loreLabel = (lore) => game.i18n.localize(game.wfrp4e?.config?.magicLores?.[lore] ?? lore);
const loresText = (summary) => summary.lores.map(loreLabel).join(", ");

const STATUS_ICONS = {
  known: "fa-check",
  readOnly: "fa-eye",
  unmemorized: "fa-book-open",
  learnable: "fa-graduation-cap"
};

function stat(key, value, hint) {
  return { label: t(`Stat.${key}`), value, hint };
}

/** Akcje "tylko do przeglądania", wspólne dla księgi i zwoju. */
const viewActions = (ctx) => [
  { id: "chat", label: t("Action.Chat"), icon: "fa-comment" },
  ...(ctx.form === FORM_SCROLL ? [] : [{ id: "openSheet", label: t("Action.Open"), icon: "fa-up-right-from-square" }])
];

async function bookDetails(entry, status, ctx) {
  const s = spellSummary(entry.data);
  const owner = ctx.actor?.isOwner;
  // Niezapamiętane zaklęcie z karty rzuca się z księgi – wymaga księgi przy sobie, jak kopia
  const fromBook = FROM_BOOK_STATUSES.includes(status);
  const castable = fromBook && ctx.carried && owner;
  const cn = effectiveCN(s, status);
  const actions = [];
  if (castable) actions.push({ id: "cast", label: t("Action.Cast"), icon: "fa-wand-sparkles", primary: true });
  if (castable && !s.isPetty && s.cn > 0 && getEdition() !== "5e") actions.push({ id: "channel", label: t("Action.Channel"), icon: "fa-hurricane" });
  // Zapamiętanie: te same warunki co rzucanie (czytanie + Tradycja); koszt PD liczy system
  if (owner && [...FROM_BOOK_STATUSES, "learnable"].includes(status)) actions.push({ id: "learn", label: t("Action.Learn"), icon: "fa-graduation-cap" });
  actions.push(...viewActions(ctx));
  return {
    img: s.img,
    subtitle: loresText(s),
    stats: [
      // Przy rzucaniu z księgi pokazujemy też PM po zapamiętaniu (system podwaja PM niezapamiętanych)
      stat("CN", cn, cn !== s.cn ? t("Stat.CNMemorized", { cn: s.cn }) : null),
      stat("Range", s.range), stat("Target", s.target), stat("Duration", s.duration)
    ],
    description: await TextEditorImpl().enrichHTML(s.description, { relativeTo: ctx.item, secrets: ctx.isGM }),
    note: fromBook && !ctx.carried && ctx.actor ? t("Note.notCarried") : t(`Note.${status}`, { lore: loresText(s) }),
    actions
  };
}

async function scrollDetails(entry, ctx) {
  const s = spellSummary(entry.data);
  const canCast = ctx.actor?.isOwner && ctx.reading.readable && scrollCount(ctx.item) > 0;
  const consumeNote = getSettings().consumeOnFailure ? t("Scroll.NoteConsume") : t("Scroll.NoteConsumeOnSuccess");
  return {
    img: s.img,
    subtitle: loresText(s),
    stats: [stat("CN", s.cn), stat("Range", s.range), stat("Target", s.target), stat("Duration", s.duration)],
    description: await TextEditorImpl().enrichHTML(s.description, { relativeTo: ctx.item, secrets: ctx.isGM }),
    note: !ctx.actor ? t("Scroll.NoteNoActor") : !ctx.reading.readable ? t("Scroll.CannotRead") : consumeNote,
    actions: [
      ...(canCast ? [{ id: "castScroll", label: t("Scroll.Cast"), icon: "fa-wand-sparkles", primary: true }] : []),
      ...viewActions(ctx)
    ]
  };
}

async function postToChat(entry, ctx) {
  const s = spellSummary(entry.data);
  const content = await foundry.applications.handlebars.renderTemplate(`modules/${MODULE_ID}/templates/chat-spell.hbs`, {
    ...s,
    lore: loresText(s),
    description: await TextEditorImpl().enrichHTML(s.description),
    book: ctx.item.name
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: ctx.actor }), content });
}

async function openSheet(entry) {
  const source = entry.sourceUuid ? await fromUuid(entry.sourceUuid).catch(() => null) : null;
  if (source?.sheet) return source.sheet.render(true);
  const temp = new Item.implementation(foundry.utils.deepClone(entry.data));
  return temp.sheet.render(true, { editable: false });
}

export const spellType = {
  id: SPELL_TYPE,
  order: 10,
  labelKey: `${I18N}.Types.spell`,

  async fromDrop(data) {
    if (data?.type !== "Item") return null;
    const item = await Item.implementation.fromDropData(data);
    if (item?.type !== "spell") return null;
    return spellEntry(item.toObject(), { id: foundry.utils.randomID(), sourceUuid: item.uuid });
  },

  same: sameSpell,
  name: (entry) => entry.data.name,

  group(entry) {
    const lore = spellLores(entry.data)[0] ?? "";
    return { key: lore, label: lore ? loreLabel(lore) : "", rank: lore === "petty" ? 0 : 1 };
  },

  status(entry, ctx) {
    if (!ctx.view) return "none";
    if (ctx.form === FORM_SCROLL) return ctx.reading.readable ? "castable" : "unreadable";
    return spellStatus(ctx.view, spellSummary(entry.data), ctx.reading, ctx.book.requirements, loreLabel);
  },

  statusLabel: (status) => t(`Status.${status}`),
  statusIcon: (status) => STATUS_ICONS[status] ?? "",

  corner(entry, status) {
    const cn = effectiveCN(spellSummary(entry.data), status);
    return cn ? `${t("CNShort")} ${cn}` : "";
  },

  details: (entry, status, ctx) => (ctx.form === FORM_SCROLL ? scrollDetails(entry, ctx) : bookDetails(entry, status, ctx)),

  async run(action, entry, ctx) {
    if (action === "cast") return castFromBook(ctx.item, entry);
    if (action === "channel") return castFromBook(ctx.item, entry, { channel: true });
    if (action === "learn") return requestMemorize(ctx.item, entry);
    if (action === "castScroll") return castFromScroll(ctx.item);
    if (action === "chat") return postToChat(entry, ctx);
    if (action === "openSheet") return openSheet(entry);
  }
};
