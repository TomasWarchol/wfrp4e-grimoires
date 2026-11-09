/**
 * Okno księgi – rozkładówka: spis treści po lewej, wybrany wpis po prawej.
 * O treści i akcjach wpisu decyduje jego typ (entry-types.mjs).
 */
import { MODULE_ID, I18N, t } from "./constants.mjs";
import { addEntry, groupEntries, illegible, moveEntry, readBook, removeEntry, writeBook } from "./grimoire-data.mjs";
import { SPELL_TYPE } from "./spell-data.mjs";
import { entryFromDrop, typeOf } from "./entry-types.mjs";
import { LANGUAGES, normalize } from "./names.mjs";
import { requirementBadges } from "./requirements.mjs";
import { bookContext, syncCopies } from "./actors.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;

export const languageLabel = (key) => (game.i18n.has(`${I18N}.Languages.${key}`) ? t(`Languages.${key}`) : key);

/** Pole wyboru warunku w trybie edycji. */
const REQUIREMENT_TOGGLES = ["readWrite", "language", "carried", "lore"];

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
      selectEntry: GrimoireApp.#onSelect,
      entryAction: GrimoireApp.#onEntryAction,
      toggleEdit: GrimoireApp.#onToggleEdit,
      removeEntry: GrimoireApp.#onRemove,
      moveUp: GrimoireApp.#onMove,
      moveDown: GrimoireApp.#onMove
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

  get data() {
    return readBook(this.book);
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
    const ctx = bookContext(this.book);
    const { book, actor, reading, isGM } = ctx;
    const hidden = !reading.readable && !isGM;

    const rows = book.entries
      .filter((entry) => isGM || !typeOf(entry).visible || typeOf(entry).visible(entry, ctx))
      .map((entry) => {
        const type = typeOf(entry);
        return { entry, type, status: type.status(entry, ctx) };
      });
    if (!this.selectedId || !rows.some((r) => r.entry.id === this.selectedId)) this.selectedId = rows[0]?.entry.id ?? null;

    const query = normalize(this.search);
    const visible = rows.filter((r) => !query || hidden || normalize(r.type.name(r.entry)).includes(query));
    const byId = new Map(visible.map((r) => [r.entry.id, r]));
    const multipleTypes = new Set(rows.map((r) => r.type.id)).size > 1;
    const seenOrders = new Set();

    const groups = groupEntries(visible.map((r) => r.entry), (entry) => ({
      ...typeOf(entry).group(entry),
      order: typeOf(entry).order ?? 0
    })).map((group) => {
      const firstOfType = !seenOrders.has(group.order);
      seenOrders.add(group.order);
      const labelKey = typeOf(group.entries[0]).labelKey;
      return {
        lore: group.key,
        typeLabel: multipleTypes && firstOfType && labelKey ? game.i18n.localize(labelKey) : null,
        label: hidden ? illegible(group.label) : group.label,
        entries: group.entries.map((entry) => {
          const row = byId.get(entry.id);
          const name = row.type.name(entry);
          return {
            id: entry.id,
            name: hidden ? illegible(name) : name,
            corner: row.type.corner?.(entry, row.status, ctx) ?? "",
            status: row.status,
            statusLabel: row.type.statusLabel(row.status),
            statusIcon: row.type.statusIcon?.(row.status) ?? "",
            selected: entry.id === this.selectedId
          };
        })
      };
    });

    const selected = rows.find((r) => r.entry.id === this.selectedId);
    let details = null;
    if (selected) {
      const name = selected.type.name(selected.entry);
      const info = await selected.type.details(selected.entry, selected.status, ctx);
      details = {
        id: selected.entry.id,
        name: hidden ? illegible(name) : name,
        subtitle: hidden ? illegible(info.subtitle) : info.subtitle,
        stats: info.stats,
        description: hidden ? "" : info.description,
        hidden,
        status: selected.status,
        note: info.note,
        actions: hidden ? [] : info.actions
      };
    }

    const hasSpells = book.entries.some((entry) => entry.type === SPELL_TYPE) || book.entries.length === 0;
    return {
      book: this.book,
      cover: book.cover,
      languageLabel: languageLabel(book.language),
      languages: Object.keys(LANGUAGES).map((key) => ({ key, label: languageLabel(key), selected: key === book.language })),
      customLanguage: LANGUAGES[book.language] ? "" : book.language,
      badges: actor ? requirementBadges(reading, book.requirements).map((b) => ({
        ...b,
        label: b.key === "language" ? t("Badge.language", { language: languageLabel(book.language) }) : t(`Badge.${b.key}`)
      })) : [],
      requirementToggles: REQUIREMENT_TOGGLES
        .filter((key) => key !== "lore" || hasSpells)
        .map((key) => ({ key, label: t(`Edit.Needs.${key}`), checked: book.requirements[key] })),
      actorName: actor?.name,
      carried: ctx.carried,
      showCarried: Boolean(actor) && book.requirements.carried,
      groups,
      empty: rows.length === 0,
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

    html.querySelector("select[name=language]")?.addEventListener("change", (ev) => this.#updateBook({ language: ev.target.value }));
    html.querySelector("input[name=customLanguage]")?.addEventListener("change", (ev) => {
      if (ev.target.value.trim()) this.#updateBook({ language: ev.target.value.trim() });
    });
    html.querySelector("input[name=cover]")?.addEventListener("change", (ev) => this.#updateBook({ cover: ev.target.value }));
    for (const box of html.querySelectorAll("input[data-requirement]")) {
      box.addEventListener("change", (ev) => this.#updateBook({
        requirements: { ...this.data.requirements, [ev.target.dataset.requirement]: ev.target.checked }
      }));
    }

    // Element główny okna jest ten sam między renderami – nasłuch tylko raz
    if (this.canEdit && this._dropBoundTo !== html) {
      this._dropBoundTo = html;
      html.addEventListener("dragover", (ev) => ev.preventDefault());
      html.addEventListener("drop", (ev) => this.#onDrop(ev));
    }

    if (this._turnPage) {
      html.querySelector(".grimoire-page.right")?.classList.add("turning");
      this._turnPage = false;
    }
  }

  /* -------------------------------------------- */

  async #updateBook(changes) {
    await this.book.update(writeBook({ ...this.data, ...changes }));
  }

  async #onDrop(event) {
    const data = TextEditorImpl().getDragEventData(event);
    if (!data) return;
    const found = await entryFromDrop(data);
    if (!found) return ui.notifications.warn(t("Notify.NotWritable"));
    const { entry, type } = found;
    if (type.canWrite && !type.canWrite()) return ui.notifications.warn(game.i18n.localize(type.writeDeniedKey ?? `${I18N}.Notify.NotWritable`));
    const { book, added } = addEntry(this.data, entry, type.same);
    if (!added) return ui.notifications.info(t("Notify.AlreadyInBook", { name: type.name(entry) }));
    this.selectedId = entry.id;
    await this.#updateBook({ entries: book.entries });
  }

  #entry(target) {
    const id = target.closest("[data-entry-id]")?.dataset.entryId ?? this.selectedId;
    return this.data?.entries.find((e) => e.id === id);
  }

  static #onSelect(_event, target) {
    const id = target.closest("[data-entry-id]")?.dataset.entryId;
    if (!id || id === this.selectedId) return;
    this.selectedId = id;
    this._turnPage = true;
    this.render({ parts: ["book"] });
  }

  static async #onEntryAction(_event, target) {
    const entry = this.#entry(target);
    if (entry) await typeOf(entry).run(target.dataset.entryAction, entry, bookContext(this.book));
  }

  static #onToggleEdit() {
    this.editMode = !this.editMode;
    this.render();
  }

  static async #onRemove(_event, target) {
    const entry = this.#entry(target);
    if (!entry) return;
    const type = typeOf(entry);
    if (type.canWrite && !type.canWrite()) return ui.notifications.warn(game.i18n.localize(type.writeDeniedKey ?? `${I18N}.Notify.NotWritable`));
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: t("Edit.RemoveTitle") },
      content: `<p>${t("Edit.RemoveConfirm", { name: foundry.utils.escapeHTML(type.name(entry)) })}</p>`
    });
    if (ok) await this.#updateBook({ entries: removeEntry(this.data, entry.id).entries });
  }

  static async #onMove(_event, target) {
    const entry = this.#entry(target);
    const direction = target.dataset.action === "moveUp" ? -1 : 1;
    if (entry) await this.#updateBook({ entries: moveEntry(this.data, entry.id, direction).entries });
  }
}
