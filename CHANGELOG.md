# Changelog

## 0.5.0
- **Book engine**: a tome now holds typed entries. Spells are one type; other modules add their own with `registerEntryType` (Old World Alchemy adds recipes). One tome can hold several types, and entries of a disabled module stay in the book.
- A scroll is a one-entry tome, stored in the same format.
- **Requirements belong to each book**: literacy, language, being carried and knowing the Lore are set in edit mode. The four world settings are gone from the settings window; a world's earlier choices stay as the defaults for books without their own.
- Books and scrolls from earlier versions keep working and are saved in the new format the first time they change.
- Removed: the **Write description** button and `api.scrolls.random`.
- Renamed in the interface: Grimoires are now Tomes, Magic Scrolls are now Scrolls.
- Fixed: reopening a book window no longer stacks drop handlers on its window.

## 0.4.1
- A grimoire marked as Carried keeps its full encumbrance. The system treated it as worn gear and reduced it by 1.

## 0.4.0
- **Spellbook** in the Create Item window: the new book opens right away.

## 0.3.0
- Removed the optional casting fatigue (Magical Endurance) house rule: its settings, badge, chat messages and the `endurance` API. Leftover `flags.wfrp4e-grimoires.endurance` on actors are ignored.

## 0.2.0
- **Magic scrolls**: a *Books and Documents* trapping marked by the module, holding one spell and a language; quantity = number of scrolls. Own **Magic Scrolls** inventory section, *Make into magic scroll* in the item sheet header.
- Scroll window (unrolled parchment): spell details, requirement badges, scroll count, **Read and cast** (a normal system casting test with base CN for a spell the character doesn't know; chat cards work as usual) and **To chat**. Edit mode: drop a spell, language.
- A scroll is used up after the test (setting: only after a successful test). The last scroll crumbles.
- Random scroll API: `api.scrolls.random({ lore, maxCN, actor })`.
- **Casting fatigue** (optional house rule, off by default): Magical Endurance pool (formula setting), spent by casting (base or effective CN), channelling and scrolls; below zero an Endurance test of rising difficulty, Fatigued on failure; regeneration with game time; badge in the grimoire and scroll windows; API `endurance.get/set/rest`.
- Tested with Foundry v14 (build 370) and WFRP4e 10.1.2: scroll casting and consumption, casting fatigue costs and the Endurance test.

## 0.1.0
- First version: spellbooks for WFRP4e 10.x.
- A grimoire is a *Books and Documents* trapping marked by the module, with its own **Grimoires** inventory section, a Carried toggle, an open icon and a **+** that creates a new grimoire. *Make into grimoire* in the item sheet header.
- Open-book window: spells grouped by Lore with search and status markers, spell details with enriched description, page-turn animation, requirement badges, illegible runes for characters who can't read the book.
- While a grimoire is carried, its castable spells appear in the Magic tab as non-memorised spells (book icon), cast from the grimoire as in the 4e rules (Grimoire Miscast table). They are removed when the grimoire leaves the character or is no longer carried, and restored if a memorised copy is deleted.
- Spell status follows the sheet: memorised, on the sheet but not memorised, castable, petty spell to learn, read only, unreadable.
- CN shown as the system computes it: doubled when cast from the grimoire (rituals ×4), with the memorised CN alongside.
- Petty spells are never cast from a grimoire: no sheet copies, only "Memorise" (one system XP dialog).
- Memorise with GM approval; the XP cost comes from the system's own Memorize Spell dialog. Ticking M on a grimoire copy keeps the spell for good.
- Edit mode: drag and drop spells, reorder, remove, language, cover colour, write description.
- Talents and skills recognised in English and Polish.
- English and Polish interface.
- Tested with Foundry v14 (build 370) and WFRP4e 10.1.2.
