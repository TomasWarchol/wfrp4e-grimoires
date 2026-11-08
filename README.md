# WFRP4e – Grimoires (`wfrp4e-grimoires`)

**English** | [Polski](README.pl.md)

Spellbooks for **WFRP4e 10.x**: their own inventory section and an open-book window that lists the spells by Lore, with full spell details, casting from the book and memorising spells with GM approval.

## 📖 How it works

* A grimoire is an ordinary system item (a *Books and Documents* trapping) marked by the module. It keeps its weight, price, availability, containers and trading, and works with Item Piles. Without the module it is just a book.
* **Grimoires** get their own inventory section with a **Carried** toggle. The book icon in the row (or the item picture) opens the grimoire, and **+** creates a new one.
* Any book can become a grimoire: **Make into grimoire** in the item sheet header.

## 🪄 The grimoire window

* **Left page**: spells grouped by Lore, with CN, a search box and markers: *memorised* ✔, *on your sheet, not memorised* 📖 and *read only* 👁.
* **Right page**: the selected spell's CN, range, target, duration and full description. The page turns as you pick a spell.
* **Header**: requirement badges for the character, Read/Write, the book's language and Carried.
* **Actions**: **Cast from the grimoire**, **Channel** (4e), **Memorise**, **To chat**, **Spell sheet**.
* Characters who can't read the book see illegible runes instead of spell names. The GM always sees the text.
* **Edit mode** (✒ button, owner and GM only): drag spells onto the book, reorder or remove them, set the language (Magick, Reikspiel, Eltharin… or your own), pick the cover colour, write the item description.

## ✨ Spells from the grimoire on the sheet

This follows the WFRP 4e rules as the system implements them: a spell on the sheet that is **not memorised** (empty **M**) is cast from a grimoire, and a miscast rolls on the system's *Grimoire Miscast* table.

While a grimoire is carried, every spell the character can cast from it appears in the **Magic** tab as a non-memorised spell with a book icon. Cast it from the sheet, the Action HUD or the grimoire window, and chat cards work as usual. These copies disappear when the grimoire leaves the character, is no longer carried or loses the spell. They come back if the character forgets a memorised spell that the grimoire still holds.

## 🎓 Memorising

**Memorise** asks the GM. After the GM allows it, the system's own *Memorize Spell* dialog sets the XP cost by the rules (Ok / Free). The spell becomes the character's own: **M** is ticked, it no longer depends on the grimoire, and the XP is logged. Ticking **M** on a grimoire copy straight on the sheet does the same.

## ⚙️ Settings (world)

* Grimoire must be carried
* Require Read/Write
* Require the grimoire's language
* Require the spell's Lore (Arcane Magic of that Lore, or Petty Magic for petty spells)

Talents and skills are recognised in **English and Polish** (e.g. *Arcane Magic (Life)* / *Magia Tajemna (Życia)*, *Language (Magick)* / *Język (Magiczny)*), whatever language the Foundry interface uses. A character also counts as knowing a Lore if they already know a spell of it.

## 📦 Requirements

* Foundry VTT **v14**
* WFRP4e system **10.0+**

## 🔌 API

```javascript
const api = game.modules.get("wfrp4e-grimoires").api;
api.create(actor);   // new grimoire on a character
api.make(item);      // turn a book into a grimoire
api.open(item);      // open the grimoire window
api.read(item);      // { language, cover, spells: [...] }
```

## 🌐 Languages

English and Polish are built in. To add another language:

```bash
npm run lang:add -- de "Deutsch"
```

This creates `lang/de.json` (a copy of the English texts) and registers it in `module.json`. Translate the texts; any key you leave out falls back to English, and `npm run check` lists the untranslated keys. Translations are welcome as pull requests.

For a new language also fill in the `Aliases` section: the names of the Read/Write, Petty Magic and Arcane Magic talents, the Language skill, the Lores and the book languages as they appear in that language's compendia (comma-separated). The module then recognises characters' talents and skills in that language.

A separate translation module can also add a language without touching this one: it declares a `languages` entry with `"lang": "de"` that points to its own file with the same keys.

## 🙏 Credits

Inspired by the grimoires in *Forien's Armoury* by Forien. Written from scratch for Foundry v14 and WFRP4e 10.x.

## 📄 License

MIT – see [LICENSE](LICENSE).
