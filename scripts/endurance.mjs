/**
 * Zmęczenie rzucaniem w grze: pula WM na aktorze, koszt testów rzucania/splatania/zwojów,
 * test Odporności przy ujemnej WM i regeneracja z upływem czasu gry.
 *
 * WM przechowujemy we fladze aktora: flags["wfrp4e-grimoires"].endurance = { value }.
 * Brak flagi = pełna pula.
 */
import { MODULE_ID, t, log } from "./constants.mjs";
import { displayEndurance, enduranceCost, enduranceTestDifficulty, maxEndurance, regenerate } from "./endurance-data.mjs";
import { ENDURANCE, matchesAny } from "./names.mjs";
import { getSettings } from "./settings.mjs";

const FLAG = "endurance";

/** Kontekst testu oznaczający rzut ze zwoju (ustawiany w scripts/scrolls.mjs). */
export const SCROLL_CONTEXT = MODULE_ID;

export function enduranceEnabled() {
  return getSettings().enduranceEnabled;
}

function bonus(actor, key) {
  const c = actor?.system?.characteristics?.[key];
  return Number(c?.bonus ?? Math.floor((c?.value ?? 0) / 10));
}

/** Aktualna i maksymalna WM aktora. */
export function getEndurance(actor) {
  const max = maxEndurance(bonus(actor, "t"), bonus(actor, "wp"), getSettings().enduranceFormula);
  const stored = actor?.flags?.[MODULE_ID]?.[FLAG]?.value;
  const value = stored === undefined || stored === null ? max : Math.min(max, Number(stored));
  return { value, max, display: displayEndurance(value) };
}

export async function setEndurance(actor, value) {
  await actor.update({ [`flags.${MODULE_ID}.${FLAG}.value`]: value });
}

/** Pełny odpoczynek: WM do maksimum. */
export async function restEndurance(actor) {
  await setEndurance(actor, getEndurance(actor).max);
}

/** Umiejętność Odporność postaci (nazwa w dowolnym obsługiwanym języku). */
function enduranceSkill(actor) {
  return (actor.itemTypes?.skill ?? []).find((s) => matchesAny(s.name, ENDURANCE));
}

/** Wydaje WM; przy ujemnej puli – test Odporności, porażka = Zmęczenie. */
export async function spendEndurance(actor, amount, label) {
  if (!amount) return;
  const before = getEndurance(actor);
  const value = before.value - amount;
  await setEndurance(actor, value);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id).concat(game.user.id),
    content: `<p>${t("Endurance.Spent", { label: foundry.utils.escapeHTML(label), amount, value: displayEndurance(value), max: before.max })}</p>`
  });

  const difficulty = enduranceTestDifficulty(value, getSettings().enduranceStep);
  if (!difficulty) return;
  const skill = enduranceSkill(actor) ?? game.i18n.localize("NAME.Endurance");
  const test = await actor.setupSkill(skill, {
    appendTitle: ` – ${t("Endurance.TestTitle")}`,
    skipTargets: true,
    fields: { difficulty }
  });
  if (!test?.roll) return;
  await test.roll();
  if (test.failed) await actor.addCondition("fatigued");
}

/** Rodzaj testu do kosztu WM; `null`, gdy test nie dotyczy magii. */
function testKind(test, hookKind) {
  if (test.context?.[SCROLL_CONTEXT]?.scroll) return "scroll";
  return hookKind;
}

/** Wpięcie w testy systemu: koszt WM po teście rzucania i splatania. */
export function registerEnduranceHooks() {
  const handle = async (test, hookKind) => {
    try {
      if (!enduranceEnabled() || !test?.actor?.isOwner) return;
      // Przerzut (np. Szczęście) używa tego samego kontekstu – WM pobieramy raz
      test.context ??= {};
      const marker = (test.context[SCROLL_CONTEXT] ??= {});
      if (marker.enduranceSpent) return;
      marker.enduranceSpent = true;

      const kind = testKind(test, hookKind);
      const item = test.item;
      const baseCN = Number(item?.toObject?.().system?.cn?.value ?? item?.system?.cn?.value ?? 0);
      const effectiveCN = Number(item?.system?.cn?.value ?? baseCN);
      const s = getSettings();
      const cost = enduranceCost(kind, { baseCN, effectiveCN }, {
        useBaseCN: s.enduranceUseBaseCN,
        channelCost: s.enduranceChannelCost,
        scrollCost: s.enduranceScrollCost
      });
      await spendEndurance(test.actor, cost, item?.name ?? "");
    } catch (err) {
      log.error("Zmęczenie rzucaniem", err);
    }
  };
  Hooks.on("wfrp4e:rollCastTest", (test) => handle(test, "cast"));
  Hooks.on("wfrp4e:rollChannelTest", (test) => handle(test, "channel"));

  // Regeneracja z upływem czasu gry – liczy tylko aktywny MG (bez dublowania)
  Hooks.on("updateWorldTime", (_worldTime, delta) => {
    if (!enduranceEnabled() || !getSettings().enduranceAutoRegen || !game.users.activeGM?.isSelf || delta <= 0) return;
    for (const actor of game.actors.filter((a) => a.type === "character")) {
      const { value, max } = getEndurance(actor);
      if (value >= max) continue;
      const next = regenerate(value, max, bonus(actor, "wp"), delta);
      if (next !== value) setEndurance(actor, next);
    }
  });
}
