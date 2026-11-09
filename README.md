# WFRP4e – Grimoires (`wfrp4e-grimoires`)

**English** | [Polski](README.pl.md)

Tomes and scrolls for **WFRP4e 10.x**: their own inventory sections and an open-book window with a table of contents, full details of each entry, casting from the book and memorising spells with GM approval. A tome can hold more than spells: other modules add their own kinds of entries, such as the recipes of *Old World Alchemy*.

## 📖 How it works

* A tome is an ordinary system item (a *Books and Documents* trapping) marked by the module. It keeps its weight, price, availability, containers and trading, and works with Item Piles. Without the module it is just a book.
* **Tomes** get their own inventory section with a **Carried** toggle. The book icon in the row (or the item picture) opens the tome, and **+** creates a new one.
* Create a new one in the **Create Item** window by choosing the **Tome** type.
* Any book can become a tome: **Make into tome** in the item sheet header.

## 🪄 The tome window

* **Left page**: spells grouped by Lore, with CN, a search box and markers: *memorised* ✔, *on your sheet, not memorised* 📖 and *read only* 👁.
* **Right page**: the selected spell's CN, range, target, duration and full description. The page turns as you pick a spell.
* **Header**: requirement badges for the character, Read/Write, the book's language and Carried.
* **Actions**: **Cast from the grimoire**, **Channel** (4e), **Memorise**, **To chat**, **Spell sheet**.
* Characters who can't read the book see illegible runes instead of spell names. The GM always sees the text.
* **Edit mode** (✒ button, owner and GM only): drag entries onto the book, reorder or remove them, set the language (Magick, Reikspiel, Eltharin… or your own), pick the cover colour and decide what this book requires of its reader: literacy, its language, being carried and, for spells, knowing the Lore.

## ✨ Spells from the grimoire on the sheet

This follows the WFRP 4e rules as the system implements them: a spell on the sheet that is **not memorised** (empty **M**) is cast from a grimoire, and a miscast rolls on the system's *Grimoire Miscast* table.

While a grimoire is carried, every spell the character can cast from it appears in the **Magic** tab as a non-memorised spell with a book icon. Cast it from the sheet, the Action HUD or the grimoire window, and chat cards work as usual. These copies disappear when the grimoire leaves the character, is no longer carried or loses the spell. They come back if the character forgets a memorised spell that the grimoire still holds.

## 🎓 Memorising

**Memorise** asks the GM. After the GM allows it, the system's own *Memorize Spell* dialog sets the XP cost by the rules (Ok / Free). The spell becomes the character's own: **M** is ticked, it no longer depends on the grimoire, and the XP is logged. Ticking **M** on a grimoire copy straight on the sheet does the same.

## 📜 Scrolls

* A scroll is a one-entry tome that is used up: a *Books and Documents* trapping with a language, and its quantity is the number of scrolls. Scrolls get their own **Scrolls** inventory section; any document can become one with **Make into scroll**.
* The scroll window shows the entry, the requirement badges and how many scrolls are left.
* **Read and cast** runs the system's normal casting test with the spell's base CN, even if the character doesn't know the spell, so chat cards (damage, overcasting) work as usual. One scroll is used up afterwards (optionally only after a successful test). The last one crumbles to dust.
* Anyone who can read the scroll (Read/Write and its language, if required) can cast from it; knowing the Lore isn't needed.

## ⚙️ Settings (world)

* Failed scroll test uses up the scroll
* Name scrolls after their contents

What a book requires of its reader is set on each book, in edit mode.

Talents and skills are recognised in **English and Polish** (e.g. *Arcane Magic (Life)* / *Magia Tajemna (Życia)*, *Language (Magick)* / *Język (Magiczny)*), whatever language the Foundry interface uses. A character also counts as knowing a Lore if they already know a spell of it.

## 📦 Requirements

* Foundry VTT **v14**
* WFRP4e system **10.0+**

## 🔌 API

```javascript
const api = game.modules.get("wfrp4e-grimoires").api;
api.create(actor);   // new tome on a character
api.make(item);      // turn a book into a tome
api.open(item);      // open the tome window
api.read(item);      // { form, language, cover, requirements, entries: [{ id, type, sourceUuid, data }] }
api.registerEntryType(type); // add a new kind of entry
```

An entry type decides how an entry looks and what it can do; the window, table of contents, reading requirements and editing are shared. The contract is described in `scripts/entry-types.mjs`. Modules of this series import `scripts/public.mjs` directly. Entries of a disabled module stay in the book and work again when it comes back.

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

Unofficial fan content, not affiliated with or endorsed by Games Workshop or Cubicle 7. Warhammer and all related names are trademarks of Games Workshop Limited. The module ships no rulebook text or artwork; it works with the content you already own.
