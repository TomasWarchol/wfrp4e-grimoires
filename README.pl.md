# WFRP4e – Księgi zaklęć (`wfrp4e-grimoires`)

[English](README.md) | **Polski**

Księgi i zwoje dla **WFRP4e 10.x**: osobne działy w ekwipunku i okno otwartej księgi ze spisem treści, pełnymi szczegółami wpisu, rzucaniem z księgi i zapamiętywaniem zaklęć za zgodą MG. Księga może zawierać nie tylko zaklęcia: inne moduły dokładają własne rodzaje wpisów, na przykład receptury z *Alchemii Starego Świata*.

## 📖 Jak to działa

* Księga to zwykły przedmiot systemu (*Książki i dokumenty*) oznaczony przez moduł. Ma wagę, cenę, dostępność, kontenery i handel, działa z Item Piles. Bez modułu zostaje zwykłą książką.
* **Księgi** mają własny dział w ekwipunku z przełącznikiem **Przy sobie**. Ikona książki w wierszu (albo obrazek przedmiotu) otwiera księgę, a **+** tworzy nową.
* Nową księgę tworzysz w oknie **Utwórz przedmiot**, wybierając typ **Księga**.
* Każdą książkę można zamienić w księgę: **Uczyń księgą** w nagłówku arkusza przedmiotu.

## 🪄 Okno księgi

* **Lewa strona**: zaklęcia pogrupowane według Tradycji, z PM, wyszukiwarką i znacznikami: *zapamiętane* ✔, *na karcie, niezapamiętane* 📖 oraz *tylko do czytania* 👁.
* **Prawa strona**: PM, zasięg, cel, czas trwania i pełny opis wybranego czaru. Strona przewraca się przy wyborze zaklęcia.
* **Nagłówek**: plakietki warunków dla postaci, czyli Czytanie/Pisanie, język księgi i Przy sobie.
* **Akcje**: **Rzuć z księgi**, **Splataj** (4e), **Zapamiętaj**, **Na czat**, **Karta zaklęcia**.
* Postać, która nie umie przeczytać księgi, widzi nieczytelne runy zamiast nazw zaklęć. MG zawsze widzi treść.
* **Tryb edycji** (przycisk ✒, tylko właściciel i MG): przeciąganie wpisów na księgę, kolejność, usuwanie, język (Magiczny, Reikspiel, Eltharin… albo własny), kolor oprawy oraz to, czego ta księga wymaga od czytelnika: umiejętności czytania, znajomości języka, noszenia przy sobie, a przy zaklęciach także znajomości Tradycji.

## ✨ Zaklęcia z księgi na karcie

Moduł trzyma się zasad WFRP 4e w takiej postaci, w jakiej obsługuje je system: zaklęcie na karcie, które **nie jest zapamiętane** (puste **M**), rzuca się z księgi, a pech losuje się z systemowej tabeli *Grimoire Miscast*.

Gdy księga jest przy postaci, każde zaklęcie, które postać może z niej rzucić, pojawia się w zakładce **Magia** jako niezapamiętane, z ikoną księgi. Można je rzucać z karty, z Action HUD albo z okna księgi, a karty czatu działają jak zwykle. Kopie znikają, gdy księga opuści postać, przestanie być noszona albo straci zaklęcie. Wracają, gdy postać zapomni zapamiętane zaklęcie, które wciąż jest w księdze.

## 🎓 Zapamiętywanie

**Zapamiętaj** wysyła prośbę do MG. Po zgodzie MG systemowe okno *Memorize Spell* wylicza koszt PD według zasad (Ok / za darmo). Zaklęcie staje się własnym zaklęciem postaci: **M** jest zaznaczone, nie zależy już od księgi, a PD trafiają do dziennika doświadczenia. To samo dzieje się po zaznaczeniu **M** przy kopii z księgi bezpośrednio na karcie.

## 📜 Zwoje

* Zwój to księga na jeden wpis, która się zużywa: przedmiot z *Książek i dokumentów* z językiem, a ilość oznacza liczbę zwojów. Zwoje mają własny dział **Zwoje**; każdy dokument można zamienić w zwój przyciskiem **Uczyń zwojem**.
* Okno zwoju pokazuje wpis, plakietki warunków i liczbę pozostałych zwojów.
* **Odczytaj i rzuć** uruchamia zwykły test rzucania systemu z bazowym PM zaklęcia, nawet gdy postać go nie zna, więc karty czatu (obrażenia, przeciążenie) działają jak zwykle. Potem zużywa się jeden zwój (opcjonalnie tylko po udanym teście). Ostatni rozsypuje się w pył.
* Rzucić ze zwoju może każdy, kto umie go odczytać (Czytanie/Pisanie i jego język, jeśli wymagane); znajomość Tradycji nie jest potrzebna.

## ⚙️ Ustawienia (świat)

* Nieudany test zużywa zwój
* Nazywaj zwoje od zawartości

To, czego księga wymaga od czytelnika, ustawia się przy każdej księdze w trybie edycji.

Talenty i umiejętności są rozpoznawane **po angielsku i po polsku** (np. *Arcane Magic (Life)* / *Magia Tajemna (Życia)*, *Language (Magick)* / *Język (Magiczny)*), niezależnie od języka interfejsu Foundry. Postać zna też Tradycję, jeśli zna już jakieś jej zaklęcie.

## 📦 Wymagania

* Foundry VTT **v14**
* system WFRP4e **10.0+**

## 🔌 API

```javascript
const api = game.modules.get("wfrp4e-grimoires").api;
api.create(actor);   // nowa księga u postaci
api.make(item);      // zamiana książki w księgę
api.open(item);      // otwarcie okna księgi
api.read(item);      // { form, language, cover, requirements, entries: [{ id, type, sourceUuid, data }] }
api.registerEntryType(type); // nowy rodzaj wpisów
```

Typ wpisu decyduje o wyglądzie i działaniu wpisu; okno, spis treści, warunki czytania i edycja są wspólne. Kontrakt opisuje `scripts/entry-types.mjs`. Moduły tej serii importują bezpośrednio `scripts/public.mjs`. Wpisy wyłączonego modułu zostają w księdze i wracają do działania po jego ponownym włączeniu.

## 🌐 Języki

Angielski i polski są wbudowane. Aby dodać kolejny język:

```bash
npm run lang:add -- de "Deutsch"
```

Polecenie tworzy `lang/de.json` (kopię tekstów angielskich) i dopisuje go do `module.json`. Przetłumacz teksty; każdy pominięty klucz pokaże się po angielsku, a `npm run check` wypisze nieprzetłumaczone klucze. Tłumaczenia mile widziane jako pull requesty.

Dla nowego języka uzupełnij też sekcję `Aliases`: nazwy talentów Czytanie/Pisanie, Magia Prosta i Magia Tajemna, umiejętności Język, Tradycji i języków ksiąg tak, jak brzmią w kompendiach w tym języku (rozdzielone przecinkami). Moduł rozpozna wtedy talenty i umiejętności postaci w tym języku.

Osobny moduł tłumaczenia może też dodać język bez zmian w tym module: deklaruje wpis `languages` z `"lang": "de"`, wskazujący na własny plik z tymi samymi kluczami.

## 🙏 Podziękowania

Inspiracja: księgi z *Forien's Armoury* autorstwa Foriena. Napisany od zera dla Foundry v14 i WFRP4e 10.x.

## 📄 Licencja

MIT – zobacz [LICENSE](LICENSE).

Nieoficjalna twórczość fanowska, niezwiązana z Games Workshop ani Cubicle 7 i przez nie niepopierana. Warhammer i powiązane nazwy są znakami towarowymi Games Workshop Limited. Moduł nie zawiera tekstów ani grafik z podręczników – działa z treściami, które już posiadasz.
