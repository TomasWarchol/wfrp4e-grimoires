# WFRP4e – Księgi zaklęć (`wfrp4e-grimoires`)

[English](README.md) | **Polski**

Księgi zaklęć dla **WFRP4e 10.x**: osobny dział w ekwipunku i okno otwartej księgi ze spisem zaklęć według Tradycji, pełnymi szczegółami czaru, rzucaniem z księgi i zapamiętywaniem zaklęć za zgodą MG. Do tego zwoje magiczne i opcjonalne zmęczenie rzucaniem.

## 📖 Jak to działa

* Księga to zwykły przedmiot systemu (*Książki i dokumenty*) oznaczony przez moduł. Ma wagę, cenę, dostępność, kontenery i handel, działa z Item Piles. Bez modułu zostaje zwykłą książką.
* **Księgi zaklęć** mają własny dział w ekwipunku z przełącznikiem **Przy sobie**. Ikona książki w wierszu (albo obrazek przedmiotu) otwiera księgę, a **+** tworzy nową.
* Każdą książkę można zamienić w księgę zaklęć: **Uczyń księgą zaklęć** w nagłówku arkusza przedmiotu.

## 🪄 Okno księgi

* **Lewa strona**: zaklęcia pogrupowane według Tradycji, z PM, wyszukiwarką i znacznikami: *zapamiętane* ✔, *na karcie, niezapamiętane* 📖 oraz *tylko do czytania* 👁.
* **Prawa strona**: PM, zasięg, cel, czas trwania i pełny opis wybranego czaru. Strona przewraca się przy wyborze zaklęcia.
* **Nagłówek**: plakietki warunków dla postaci, czyli Czytanie/Pisanie, język księgi i Przy sobie.
* **Akcje**: **Rzuć z księgi**, **Splataj** (4e), **Zapamiętaj**, **Na czat**, **Karta zaklęcia**.
* Postać, która nie umie przeczytać księgi, widzi nieczytelne runy zamiast nazw zaklęć. MG zawsze widzi treść.
* **Tryb edycji** (przycisk ✒, tylko właściciel i MG): przeciąganie zaklęć na księgę, kolejność, usuwanie, język (Magiczny, Reikspiel, Eltharin… albo własny), kolor oprawy, opis przedmiotu.

## ✨ Zaklęcia z księgi na karcie

Moduł trzyma się zasad WFRP 4e w takiej postaci, w jakiej obsługuje je system: zaklęcie na karcie, które **nie jest zapamiętane** (puste **M**), rzuca się z księgi, a pech losuje się z systemowej tabeli *Grimoire Miscast*.

Gdy księga jest przy postaci, każde zaklęcie, które postać może z niej rzucić, pojawia się w zakładce **Magia** jako niezapamiętane, z ikoną księgi. Można je rzucać z karty, z Action HUD albo z okna księgi, a karty czatu działają jak zwykle. Kopie znikają, gdy księga opuści postać, przestanie być noszona albo straci zaklęcie. Wracają, gdy postać zapomni zapamiętane zaklęcie, które wciąż jest w księdze.

## 🎓 Zapamiętywanie

**Zapamiętaj** wysyła prośbę do MG. Po zgodzie MG systemowe okno *Memorize Spell* wylicza koszt PD według zasad (Ok / za darmo). Zaklęcie staje się własnym zaklęciem postaci: **M** jest zaznaczone, nie zależy już od księgi, a PD trafiają do dziennika doświadczenia. To samo dzieje się po zaznaczeniu **M** przy kopii z księgi bezpośrednio na karcie.

## 📜 Zwoje magiczne

* Zwój to też przedmiot z *Książek i dokumentów* oznaczony przez moduł: jedno zaklęcie i język, a ilość oznacza liczbę zwojów. Zwoje mają własny dział **Zwoje magiczne**; każdy dokument można zamienić w zwój przyciskiem **Uczyń zwojem magicznym**.
* Okno zwoju pokazuje zaklęcie, plakietki warunków i liczbę pozostałych zwojów.
* **Odczytaj i rzuć** uruchamia zwykły test rzucania systemu z bazowym PM zaklęcia, nawet gdy postać go nie zna, więc karty czatu (obrażenia, przeciążenie) działają jak zwykle. Potem zużywa się jeden zwój (opcjonalnie tylko po udanym teście). Ostatni rozsypuje się w pył.
* Rzucić ze zwoju może każdy, kto umie go odczytać (Czytanie/Pisanie i jego język, jeśli wymagane); znajomość Tradycji nie jest potrzebna.
* Makro MG na losowy zwój: `game.modules.get("wfrp4e-grimoires").api.scrolls.random({ lore: "fire", maxCN: 8, actor })` (bez `actor` zwój trafia do katalogu przedmiotów).

## ⏳ Zmęczenie rzucaniem (opcjonalna zasada domowa)

Domyślnie wyłączone. Po włączeniu każda postać ma pulę **Wytrzymałości Magicznej** (Bonus Wytrzymałości + 2 × Bonus Siły Woli albo inny wzór):

* Rzucanie kosztuje PM zaklęcia (bazowy albo efektywny), a splatanie i zwoje stałą wartość. Przerzucony test nie kosztuje drugi raz.
* Poniżej zera postać wykonuje test Odporności, zaczynający się jako Wymagający i trudniejący co krok; porażka daje stan Zmęczenie.
* Wytrzymałość Magiczna wraca w tempie Bonusu Siły Woli na godzinę czasu gry; w API jest `endurance.rest(actor)` na pełny odpoczynek.
* Pula jest widoczna jako plakietka w oknach księgi i zwoju; każdy koszt trafia szeptem do MG i gracza.

## ⚙️ Ustawienia (świat)

* Księga musi być przy sobie
* Wymagaj Czytania/Pisania
* Wymagaj języka księgi
* Wymagaj Tradycji zaklęcia (Magia Tajemna danej Tradycji albo Magia Prosta dla magii prostej)
* Nieudany test zużywa zwój
* Nazywaj zwoje od zaklęcia
* Zmęczenie rzucaniem: włączenie, wzór maksimum, bazowy albo efektywny PM, koszt splatania i zwoju, krok trudności, regeneracja z czasem gry

Talenty i umiejętności są rozpoznawane **po angielsku i po polsku** (np. *Arcane Magic (Life)* / *Magia Tajemna (Życia)*, *Language (Magick)* / *Język (Magiczny)*), niezależnie od języka interfejsu Foundry. Postać zna też Tradycję, jeśli zna już jakieś jej zaklęcie.

## 📦 Wymagania

* Foundry VTT **v14**
* system WFRP4e **10.0+**

## 🔌 API

```javascript
const api = game.modules.get("wfrp4e-grimoires").api;
api.create(actor);   // nowa księga u postaci
api.make(item);      // zamiana książki w księgę zaklęć
api.open(item);      // otwarcie okna księgi
api.read(item);      // { language, cover, spells: [...] }
```

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
