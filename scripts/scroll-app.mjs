/**
 * Okno zwoju – rozwinięty pergamin z jednym wpisem dowolnego typu.
 */
import { MODULE_ID, I18N, t } from "./constants.mjs";
import { illegible, readBook, writeBook } from "./grimoire-data.mjs";
import { readScroll, scrollCount } from "./scroll-data.mjs";
import { entryFromDrop, typeOf } from "./entry-types.mjs";
import { LANGUAGES } from "./names.mjs";
import { requirementBadges } from "./requirements.mjs";
import { inscribeEntry } from "./scrolls.mjs";
import { bookContext } from "./actors.mjs";
import { getSettings } from "./settings.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;

const languageLabel = (key) => (game.i18n.has(`${I18N}.Languages.${key}`) ? t(`Languages.${key}`) : key);

export class ScrollApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #open = new Map();

  static open(scroll) {
    const existing = ScrollApp.#open.get(scroll.uuid);
    if (existing) return existing.render({ force: true });
    const app = new ScrollApp({ scroll });
    ScrollApp.#open.set(scroll.uuid, app);
    return app.render({ force: true });
  }

  static refresh(scroll) {
    ScrollApp.#open.get(scroll?.uuid)?.render();
  }

  static closeFor(scroll) {
    ScrollApp.#open.get(scroll?.uuid)?.close();
  }

  static refreshForActor(actor) {
    for (const app of ScrollApp.#open.values()) if (app.scroll.actor === actor) app.render();
  }

  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "scroll-window"],
    window: { icon: "fa-solid fa-scroll", resizable: true },
    position: { width: 520, height: 640 },
    actions: {
      entryAction: ScrollApp.#onEntryAction,
      toggleEdit: ScrollApp.#onToggleEdit
    }
  };

  static PARTS = {
    scroll: { template: `modules/${MODULE_ID}/templates/scroll.hbs`, scrollable: [".scroll-body"] }
  };

  constructor({ scroll, ...options }) {
    super({ id: `${MODULE_ID}-scroll-${scroll.uuid.replaceAll(".", "-")}`, ...options });
    this.scroll = scroll;
    this.editMode = false;
  }

  get title() {
    return this.scroll.name;
  }

  async close(options) {
    ScrollApp.#open.delete(this.scroll.uuid);
    return super.close(options);
  }

  async _prepareContext() {
    const ctx = bookContext(this.scroll);
    const { book, actor, reading, isGM } = ctx;
    const hidden = !reading.readable && !isGM;
    const entry = book.entries[0] ?? null;

    let details = null;
    if (entry) {
      const type = typeOf(entry);
      const info = await type.details(entry, type.status(entry, ctx), ctx);
      const name = type.name(entry);
      details = {
        name: hidden ? illegible(name) : name,
        subtitle: hidden ? illegible(info.subtitle) : info.subtitle,
        stats: info.stats,
        description: hidden ? "" : info.description,
        note: info.note,
        actions: hidden ? info.actions.filter((a) => a.primary) : info.actions
      };
    }

    return {
      details,
      hidden,
      count: scrollCount(this.scroll),
      languageLabel: languageLabel(book.language),
      languages: Object.keys(LANGUAGES).map((key) => ({ key, label: languageLabel(key), selected: key === book.language })),
      customLanguage: LANGUAGES[book.language] ? "" : book.language,
      badges: actor ? requirementBadges(reading, book.requirements).map((b) => ({
        ...b,
        label: b.key === "language" ? t("Badge.language", { language: languageLabel(book.language) }) : t(`Badge.${b.key}`)
      })) : [],
      actorName: actor?.name,
      canEdit: this.scroll.isOwner,
      editMode: this.editMode && this.scroll.isOwner
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    if (this.window?.title) this.window.title.textContent = this.title;
    const html = this.element;

    html.querySelector("select[name=language]")?.addEventListener("change", (ev) => this.#setLanguage(ev.target.value));
    html.querySelector("input[name=customLanguage]")?.addEventListener("change", (ev) => {
      if (ev.target.value.trim()) this.#setLanguage(ev.target.value.trim());
    });

    // Element główny okna jest ten sam między renderami – nasłuch tylko raz
    if (this.scroll.isOwner && this._dropBoundTo !== html) {
      this._dropBoundTo = html;
      html.addEventListener("dragover", (ev) => ev.preventDefault());
      html.addEventListener("drop", (ev) => this.#onDrop(ev));
    }
  }

  async #setLanguage(language) {
    await this.scroll.update(writeBook({ ...readBook(this.scroll), language }));
  }

  async #onDrop(event) {
    const dropData = TextEditorImpl().getDragEventData(event);
    if (!dropData) return;
    const found = await entryFromDrop(dropData);
    if (!found) return ui.notifications.warn(t("Notify.NotWritable"));
    const { entry, type } = found;
    if (type.canWrite && !type.canWrite()) return ui.notifications.warn(game.i18n.localize(type.writeDeniedKey ?? `${I18N}.Notify.NotWritable`));
    await inscribeEntry(this.scroll, entry, { rename: getSettings().renameScrolls });
  }

  static async #onEntryAction(_event, target) {
    const entry = readScroll(this.scroll)?.entry;
    if (entry) await typeOf(entry).run(target.dataset.entryAction, entry, bookContext(this.scroll));
  }

  static #onToggleEdit() {
    this.editMode = !this.editMode;
    this.render();
  }
}
