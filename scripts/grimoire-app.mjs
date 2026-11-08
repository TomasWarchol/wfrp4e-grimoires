/**
 * Okno księgi zaklęć – rozkładówka: spis zaklęć według Tradycji po lewej, szczegóły po prawej.
 */
import { MODULE_ID, I18N, t } from "./constants.mjs";
import { getEdition } from "./edition.mjs";
import {
  FLAG_SCOPE, FROM_BOOK_STATUSES, GRIMOIRE_FLAG, addSpell, effectiveCN, groupByLore, illegible, moveSpell,
  readGrimoire, removeSpell, spellEntry, spellSummary
} from "./grimoire-data.mjs";
import { LANGUAGES, normalize } from "./names.mjs";
import { evaluateReading, requirementBadges, spellStatus } from "./requirements.mjs";
import { actorView, castFromBook, isCarried, requestMemorize, syncCopies } from "./actors.mjs";
import { getSettings } from "./settings.mjs";
import { enduranceEnabled, getEndurance } from "./endurance.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;

export class GrimoireApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Otwarte okna według UUID księgi (jedno okno na księgę). */
  static #open = new Map();

  static open(book) {
    const existing = GrimoireApp.#open.get(book.uuid);
    if (book.actor) syncCopies(book);
    if (existing) return existing.render({ force: true });
    const app = new GrimoireApp({ book });
    GrimoireApp.#open.set(book.uuid, app);
    return app.render({ force: true });
  }

  /** Odświeża okna księgi po zmianie przedmiotu lub aktora. */
  static refresh(book) {
    GrimoireApp.#open.get(book?.uuid)?.render();
  }

  static refreshForActor(actor) {
    for (const app of GrimoireApp.#open.values()) if (app.book.actor === actor) app.render();
  }

  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "grimoire-window"],
    window: { icon: "fa-solid fa-book-journal-whills", resizable: true },
    position: { width: 920, height: 660 },
    actions: {
      selectSpell: GrimoireApp.#onSelect,
      cast: GrimoireApp.#onCast,
      channel: GrimoireApp.#onChannel,
      learn: GrimoireApp.#onLearn,
      chat: GrimoireApp.#onChat,
      openSpell: GrimoireApp.#onOpenSpell,
      toggleEdit: GrimoireApp.#onToggleEdit,
      removeSpell: GrimoireApp.#onRemove,
      moveUp: GrimoireApp.#onMove,
      moveDown: GrimoireApp.#onMove,
      describe: GrimoireApp.#onDescribe
    }
  };

  static PARTS = {
    book: { template: `modules/${MODULE_ID}/templates/grimoire.hbs`, scrollable: [".grimoire-toc-list", ".grimoire-details"] }
  };

  constructor({ book, ...options }) {
    super({ id: `${MODULE_ID}-${book.uuid.replaceAll(".", "-")}`, ...options });
    this.book = book;
    this.selectedId = null;
    this.editMode = false;
    this.search = "";
  }

  get title() {
    return this.book.name;
  }

  get grimoire() {
    return readGrimoire(this.book);
  }

  get canEdit() {
    return this.book.isOwner;
  }

  async close(options) {
    GrimoireApp.#open.delete(this.book.uuid);
    return super.close(options);
  }

  /* -------------------------------------------- */

  async _prepareContext() {
    const grimoire = this.grimoire ?? { spells: [], language: "magick" };
    const settings = getSettings();
    const actor = this.book.actor;
    const config = game.wfrp4e?.config ?? {};
    const loreLabel = (lore) => game.i18n.localize(config.magicLores?.[lore] ?? lore);
    const isGM = game.user.isGM;

    const view = actor ? actorView(actor) : null;
    const reading = view ? evaluateReading(view, grimoire, settings) : { readable: true, readWrite: true, language: true };
    const hidden = !reading.readable && !isGM;
    const carried = isCarried(this.book);

    const entries = grimoire.spells.map((entry) => {
      const summary = spellSummary(entry.data);
      const status = view ? spellStatus(view, summary, reading, settings, loreLabel) : "none";
      return { entry, summary, status };
    });

    if (!this.selectedId || !entries.some((e) => e.entry.id === this.selectedId)) this.selectedId = entries[0]?.entry.id ?? null;

    const query = normalize(this.search);
    const visible = entries.filter((e) => !query || hidden || normalize(e.summary.name).includes(query));
    const byId = new Map(visible.map((e) => [e.entry.id, e]));
    const groups = groupByLore(visible.map((e) => e.entry), loreLabel).map((group) => ({
      lore: group.lore,
      label: hidden ? illegible(group.label) : group.label,
      entries: group.entries.map((entry) => {
        const e = byId.get(entry.id);
        return {
          id: entry.id,
          name: hidden ? illegible(e.summary.name) : e.summary.name,
          cn: effectiveCN(e.summary, e.status),
          status: e.status,
          statusLabel: t(`Status.${e.status}`),
          selected: entry.id === this.selectedId
        };
      })
    }));

    const selected = entries.find((e) => e.entry.id === this.selectedId);
    let details = null;
    if (selected) {
      const s = selected.summary;
      const owner = actor?.isOwner;
      // Niezapamiętane zaklęcie z karty rzuca się z księgi – wymaga księgi przy sobie, jak kopia
      const fromBook = FROM_BOOK_STATUSES.includes(selected.status);
      const castable = fromBook && carried && owner;
      const cn = effectiveCN(s, selected.status);
      details = {
        id: selected.entry.id,
        name: hidden ? illegible(s.name) : s.name,
        img: s.img,
        lore: s.lores.map(loreLabel).join(", "),
        cn,
        // Przy rzucaniu z księgi pokazujemy też PM po zapamiętaniu (system podwaja PM niezapamiętanych)
        baseCN: cn !== s.cn ? s.cn : null,
        range: s.range,
        target: s.target,
        duration: s.duration,
        hidden,
        description: hidden ? "" : await TextEditorImpl().enrichHTML(s.description, { relativeTo: this.book, secrets: isGM }),
        status: selected.status,
        note: fromBook && !carried && actor
          ? t("Note.notCarried")
          : t(`Note.${selected.status}`, { lore: s.lores.map(loreLabel).join(", ") }),
        canCast: castable,
        canChannel: castable && !s.isPetty && s.cn > 0 && getEdition() !== "5e",
        // Zapamiętanie: te same warunki co rzucanie (czytanie + Tradycja); koszt PD liczy system
        canLearn: owner && [...FROM_BOOK_STATUSES, "learnable"].includes(selected.status)
      };
    }

    const languageLabel = (key) => game.i18n.has(`${I18N}.Languages.${key}`) ? t(`Languages.${key}`) : key;
    return {
      book: this.book,
      cover: grimoire.cover,
      languageLabel: languageLabel(grimoire.language),
      languages: Object.keys(LANGUAGES).map((key) => ({ key, label: languageLabel(key), selected: key === grimoire.language })),
      customLanguage: LANGUAGES[grimoire.language] ? "" : grimoire.language,
      badges: actor ? requirementBadges(reading, settings).map((b) => ({
        ...b,
        label: b.key === "language" ? t("Badge.language", { language: languageLabel(grimoire.language) }) : t(`Badge.${b.key}`)
      })) : [],
      actorName: actor?.name,
      endurance: actor && enduranceEnabled() ? getEndurance(actor) : null,
      carried,
      showCarried: Boolean(actor) && settings.requireCarried,
      groups,
      empty: grimoire.spells.length === 0,
      details,
      canEdit: this.canEdit,
      editMode: this.editMode && this.canEdit,
      search: this.search
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Tytuł okna nadążający za nazwą księgi
    if (this.window?.title) this.window.title.textContent = this.title;

    html.querySelector("input[name=search]")?.addEventListener("input", (ev) => {
      this.search = ev.target.value;
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => this.render({ parts: ["book"] }).then(() => {
        const input = this.element.querySelector("input[name=search]");
        input?.focus();
        input?.setSelectionRange(input.value.length, input.value.length);
      }), 200);
    });

    html.querySelector("select[name=language]")?.addEventListener("change", (ev) => this.#updateGrimoire({ language: ev.target.value }));
    html.querySelector("input[name=customLanguage]")?.addEventListener("change", (ev) => {
      if (ev.target.value.trim()) this.#updateGrimoire({ language: ev.target.value.trim() });
    });
    html.querySelector("input[name=cover]")?.addEventListener("change", (ev) => this.#updateGrimoire({ cover: ev.target.value }));

    if (this.canEdit) {
      html.addEventListener("dragover", (ev) => ev.preventDefault());
      html.addEventListener("drop", (ev) => this.#onDrop(ev));
    }

    if (this._turnPage) {
      html.querySelector(".grimoire-page.right")?.classList.add("turning");
      this._turnPage = false;
    }
  }

  /* -------------------------------------------- */

  async #updateGrimoire(changes) {
    const current = this.grimoire ?? {};
    await this.book.update({ [`flags.${FLAG_SCOPE}.${GRIMOIRE_FLAG}`]: { ...current, ...changes } });
  }

  async #onDrop(event) {
    const data = TextEditorImpl().getDragEventData(event);
    if (data?.type !== "Item") return;
    const item = await Item.implementation.fromDropData(data);
    if (item?.type !== "spell") return ui.notifications.warn(t("Notify.OnlySpells"));
    const entry = spellEntry(item.toObject(), { id: foundry.utils.randomID(), sourceUuid: item.uuid });
    const { grimoire, added } = addSpell(this.grimoire, entry);
    if (!added) return ui.notifications.info(t("Notify.AlreadyInBook", { spell: item.name }));
    this.selectedId = entry.id;
    await this.#updateGrimoire({ spells: grimoire.spells });
  }

  #entry(target) {
    const id = target.closest("[data-entry-id]")?.dataset.entryId ?? this.selectedId;
    return this.grimoire?.spells.find((s) => s.id === id);
  }

  static #onSelect(_event, target) {
    const id = target.closest("[data-entry-id]")?.dataset.entryId;
    if (!id || id === this.selectedId) return;
    this.selectedId = id;
    this._turnPage = true;
    this.render({ parts: ["book"] });
  }

  static async #onCast(_event, target) {
    const entry = this.#entry(target);
    if (entry) await castFromBook(this.book, entry);
  }

  static async #onChannel(_event, target) {
    const entry = this.#entry(target);
    if (entry) await castFromBook(this.book, entry, { channel: true });
  }

  static async #onLearn(_event, target) {
    const entry = this.#entry(target);
    if (entry) await requestMemorize(this.book, entry);
  }

  static async #onChat(_event, target) {
    const entry = this.#entry(target);
    if (!entry) return;
    const s = spellSummary(entry.data);
    const content = await foundry.applications.handlebars.renderTemplate(`modules/${MODULE_ID}/templates/chat-spell.hbs`, {
      ...s,
      lore: s.lores.map((l) => game.i18n.localize(game.wfrp4e?.config?.magicLores?.[l] ?? l)).join(", "),
      description: await TextEditorImpl().enrichHTML(s.description),
      book: this.book.name
    });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.book.actor }), content });
  }

  static async #onOpenSpell(_event, target) {
    const entry = this.#entry(target);
    if (!entry) return;
    const source = entry.sourceUuid ? await fromUuid(entry.sourceUuid).catch(() => null) : null;
    if (source?.sheet) return source.sheet.render(true);
    const temp = new Item.implementation(foundry.utils.deepClone(entry.data));
    return temp.sheet.render(true, { editable: false });
  }

  static #onToggleEdit() {
    this.editMode = !this.editMode;
    this.render();
  }

  static async #onRemove(_event, target) {
    const entry = this.#entry(target);
    if (!entry) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: t("Edit.RemoveTitle") },
      content: `<p>${t("Edit.RemoveConfirm", { spell: foundry.utils.escapeHTML(entry.data.name) })}</p>`
    });
    if (ok) await this.#updateGrimoire({ spells: removeSpell(this.grimoire, entry.id).spells });
  }

  static async #onMove(_event, target) {
    const entry = this.#entry(target);
    const direction = target.dataset.action === "moveUp" ? -1 : 1;
    if (entry) await this.#updateGrimoire({ spells: moveSpell(this.grimoire, entry.id, direction).spells });
  }

  static async #onDescribe() {
    const grimoire = this.grimoire;
    const config = game.wfrp4e?.config ?? {};
    const loreLabel = (lore) => game.i18n.localize(config.magicLores?.[lore] ?? lore);
    const groups = groupByLore(grimoire.spells, loreLabel);
    const parts = groups.map((g) => t("Describe.Lore", { count: g.entries.length, lore: g.label || "—" }));
    const language = game.i18n.has(`${I18N}.Languages.${grimoire.language}`) ? t(`Languages.${grimoire.language}`) : grimoire.language;
    const html = `<p>${t("Describe.Summary", { language, list: parts.join(", ") })}</p>` +
      `<ul>${grimoire.spells.map((s) => `<li>${foundry.utils.escapeHTML(s.data.name)}</li>`).join("")}</ul>`;
    await this.book.update({ "system.description.value": html });
    ui.notifications.info(t("Describe.Done"));
  }
}
