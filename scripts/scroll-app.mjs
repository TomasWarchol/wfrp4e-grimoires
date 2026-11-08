/**
 * Okno zwoju magicznego – rozwinięty pergamin z jednym zaklęciem.
 */
import { MODULE_ID, I18N, t } from "./constants.mjs";
import { FLAG_SCOPE, illegible, spellSummary } from "./grimoire-data.mjs";
import { SCROLL_FLAG, readScroll, scrollCount } from "./scroll-data.mjs";
import { LANGUAGES } from "./names.mjs";
import { requirementBadges } from "./requirements.mjs";
import { castFromScroll, inscribeSpell, scrollReading } from "./scrolls.mjs";
import { getSettings } from "./settings.mjs";
import { enduranceEnabled, getEndurance } from "./endurance.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;

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
      cast: ScrollApp.#onCast,
      chat: ScrollApp.#onChat,
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
    const data = readScroll(this.scroll) ?? { language: "magick", spell: null };
    const settings = getSettings();
    const actor = this.scroll.actor;
    const reading = scrollReading(this.scroll);
    const hidden = !reading.readable && !game.user.isGM;
    const config = game.wfrp4e?.config ?? {};
    const loreLabel = (lore) => game.i18n.localize(config.magicLores?.[lore] ?? lore);
    const languageLabel = (key) => game.i18n.has(`${I18N}.Languages.${key}`) ? t(`Languages.${key}`) : key;

    let spell = null;
    if (data.spell) {
      const s = spellSummary(data.spell.data);
      spell = {
        name: hidden ? illegible(s.name) : s.name,
        img: s.img,
        lore: hidden ? illegible(s.lores.map(loreLabel).join(", ")) : s.lores.map(loreLabel).join(", "),
        cn: s.cn,
        range: s.range,
        target: s.target,
        duration: s.duration,
        description: hidden ? "" : await TextEditorImpl().enrichHTML(s.description, { relativeTo: this.scroll, secrets: game.user.isGM })
      };
    }

    const count = scrollCount(this.scroll);
    return {
      spell,
      hidden,
      count,
      languageLabel: languageLabel(data.language),
      languages: Object.keys(LANGUAGES).map((key) => ({ key, label: languageLabel(key), selected: key === data.language })),
      customLanguage: LANGUAGES[data.language] ? "" : data.language,
      badges: actor ? requirementBadges(reading, settings).map((b) => ({
        ...b,
        label: b.key === "language" ? t("Badge.language", { language: languageLabel(data.language) }) : t(`Badge.${b.key}`)
      })) : [],
      actorName: actor?.name,
      endurance: actor && enduranceEnabled() ? getEndurance(actor) : null,
      canCast: Boolean(actor?.isOwner && spell && reading.readable && count > 0),
      note: !spell ? "" : !actor ? t("Scroll.NoteNoActor") : !reading.readable ? t("Scroll.CannotRead")
        : settings.consumeOnFailure ? t("Scroll.NoteConsume") : t("Scroll.NoteConsumeOnSuccess"),
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

    if (this.scroll.isOwner) {
      html.addEventListener("dragover", (ev) => ev.preventDefault());
      html.addEventListener("drop", (ev) => this.#onDrop(ev));
    }
  }

  async #setLanguage(language) {
    const current = readScroll(this.scroll) ?? {};
    await this.scroll.update({ [`flags.${FLAG_SCOPE}.${SCROLL_FLAG}`]: { ...current, language } });
  }

  async #onDrop(event) {
    const dropData = TextEditorImpl().getDragEventData(event);
    if (dropData?.type !== "Item") return;
    const item = await Item.implementation.fromDropData(dropData);
    if (item?.type !== "spell") return ui.notifications.warn(t("Notify.OnlySpells"));
    await inscribeSpell(this.scroll, item, { rename: getSettings().renameScrolls });
  }

  static async #onCast() {
    await castFromScroll(this.scroll);
  }

  static async #onChat() {
    const data = readScroll(this.scroll);
    if (!data?.spell) return;
    const s = spellSummary(data.spell.data);
    const content = await foundry.applications.handlebars.renderTemplate(`modules/${MODULE_ID}/templates/chat-spell.hbs`, {
      ...s,
      lore: s.lores.map((l) => game.i18n.localize(game.wfrp4e?.config?.magicLores?.[l] ?? l)).join(", "),
      description: await TextEditorImpl().enrichHTML(s.description),
      book: this.scroll.name
    });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.scroll.actor }), content });
  }

  static #onToggleEdit() {
    this.editMode = !this.editMode;
    this.render();
  }
}
