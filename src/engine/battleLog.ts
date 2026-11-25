// The 📜 Battle Log: every battle event as a line, with the rolls and maths behind it, told from one
// side's point of view. Each trainer's latest battle is kept in their save (GameState.lastBattle).
import { MOVE_BY_ID, STATUS_INFO, ZERO_IN_MAX } from '../data/moves';
import { TYPE_LABEL } from '../data/types';
import { arenaTimer, partsText, type Battle, type BEvent } from './battle';
import { maxHearts, maxTotal, nameOf, totalHealth } from './creature';

/** One line: what happened (`text`), the rolls and maths behind it (`detail`), and whose side it was (0 = the log owner's). */
export interface BattleLogEntry { round: number; text: string; tone?: string; detail?: string; side?: 0 | 1 }
export interface BattleLog { title: string; turn: number; result?: NonNullable<Battle['over']>; entries: BattleLogEntry[] }

/** Longest log kept: a marathon battle drops its oldest lines, so saves stay small. */
export const BATTLE_LOG_MAX = 250;

export function addLine(lg: BattleLog, e: BattleLogEntry) {
  lg.entries.push(e);
  if (lg.entries.length > BATTLE_LOG_MAX) lg.entries.splice(0, lg.entries.length - BATTLE_LOG_MAX);
}

const KIND_TEXT: Record<string, string> = { physical: 'Physical · Power vs Armor', elemental: 'Elemental · Focus vs Ward', support: 'Support', swap: 'Swap Move' };

/** A battle's result as side 1 (a duel's challenged trainer) sees it. */
const flipResult = (r: NonNullable<Battle['over']>) => (r === 'win' ? 'lose' : r === 'lose' ? 'win' : r);

/**
 * Add an event to a log. `who` names the creature on each side (as shown when the event plays).
 * `view` is the side the log's owner fights on: 0, or 1 for the challenged trainer in a duel.
 */
export function logBattleEvent(lg: BattleLog, b: Battle, e: BEvent, who: (side: 0 | 1) => string, view: 0 | 1 = 0) {
  const mine = (side: 0 | 1) => side === view;
  const toneFor = (t?: string) => (view === 1 && (t === 'good' || t === 'bad') ? (t === 'good' ? 'bad' : 'good') : t);
  const note = (text: string, opts: { tone?: string; detail?: string; side?: 0 | 1 } = {}) => {
    const line: BattleLogEntry = { round: b.round, text };
    if (opts.tone) line.tone = opts.tone;
    if (opts.detail) line.detail = opts.detail;
    if (opts.side !== undefined) line.side = mine(opts.side) ? 0 : 1;
    addLine(lg, line);
  };
  switch (e.t) {
    case 'say': note(e.text, { tone: toneFor(e.tone) }); break;
    case 'arena': note(e.text, { tone: 'bad' }); break;
    case 'ring': note(`${arenaTimer(b)?.name ?? 'Time'}: ${e.left} of ${e.total} rounds left.`, { tone: e.left <= 2 ? 'bad' : undefined }); break;
    case 'use': note(e.kind === 'swap' ? `${who(e.side)} swaps in with ${e.name}!` : `${who(e.side)} used ${e.name}.`, { side: e.side, detail: [e.type ? TYPE_LABEL[e.type] : null, MOVE_BY_ID[e.move]?.blitz ? 'Blitz · Power vs Ward' : KIND_TEXT[e.kind]].filter(Boolean).join(' · ') }); break;
    case 'roll': {
      const rolled = e.natural ?? e.value;
      if (e.die === 20) { note(`${e.label}: rolled ${rolled}. ${e.hit ? 'It stays to fight.' : 'It loses interest…'}`, { side: e.side }); break; }
      const mods = e.mods?.length ? ` ${partsText(e.mods)} = ${e.value}` : '';
      const verdict = e.crit ? 'Critical hit! (double damage)' : e.hit ? 'Hit!' : 'Miss.';
      note(`${who(e.side)} · ${e.label}: ${verdict}`, { side: e.side, tone: e.hit ? undefined : 'bad', detail: `d${e.die} rolled ${rolled}${mods}, needed ${e.need}+${e.label === 'Accuracy' ? ` (Evasion ${e.need})` : ''}.` });
      break;
    }
    case 'clash': {
      const foe: 0 | 1 = view === 0 ? 1 : 0;
      note(`Clash! Speeds tied: you rolled ${e.rolls[view]} (d${e.dice[view]}), the foe rolled ${e.rolls[foe]} (d${e.dice[foe]}).`, { detail: e.loser === null ? 'Even clash: no damage, and a coin flip decided turn order.' : `${mine(e.loser) ? 'You' : 'The foe'} rolled lower: ${e.dmg} damage (the difference) and acted second.` });
      if (e.coin && e.first !== undefined) note(`💰 Coin flip: ${who(e.first)} won and acts first.`, { side: e.first, tone: mine(e.first) ? 'good' : 'bad' });
      break;
    }
    case 'tired': note(`${who(e.side)} · Fatigue check: ${e.fail ? 'catching breath!' : 'kept going.'}`, { side: e.side, tone: e.fail ? 'bad' : undefined, detail: `d10 rolled ${e.value} vs Fatigue ${e.fatigue} (${e.fail ? 'at or under' : 'over'} it).` }); break;
    case 'damage': {
      const target = b.sides[e.side].team.find((x) => x.uid === e.snap.uid);
      const eff = e.eff >= 2 ? ' Super effective!' : e.eff > 0 && e.eff < 1 ? ' Not very effective.' : '';
      const k = e.calc;
      const chainText = (i: number) => { const ch = k?.cascade?.[i]; return ch ? ` (cascade d${ch.die}: ${ch.rolls.join(' + ')})` : ''; };
      const math = k ? `${k.dice.length ? `${k.dice.map((d, i) => `d${d} rolled ${k.rolls[i]}${chainText(i)}`).join(' + ')} ` : ''}${partsText(k.parts)}`.trim().replace(/^\+ /, '') + ` = ${k.raw}${k.mult !== 1 ? ` × ${k.mult} type` : ''}${k.crit ? ' × 2 crit' : ''} → ${k.total} damage.` : '';
      const left = target ? ` ${nameOf(target)}: ${e.snap.ko ? 'KO' : `Health ${totalHealth(e.snap)}/${maxTotal(target)} (${e.snap.vitality + 1} of ${maxHearts(target)} hearts)`}.` : '';
      note(`${who(e.side)} took ${e.amount} damage${e.crit ? ' (critical)' : ''}.${eff}`, { side: e.side, tone: mine(e.side) ? 'bad' : 'good', detail: `${math}${left}`.trim() || undefined });
      break;
    }
    case 'heal': if (e.amount > 0) note(`${who(e.side)} recovered ${e.amount} Health.`, { side: e.side, tone: 'good' }); break;
    case 'status': note(`${who(e.side)} is afflicted with ${STATUS_INFO[e.status].icon} ${STATUS_INFO[e.status].name}.`, { side: e.side, tone: mine(e.side) ? 'bad' : 'good', detail: STATUS_INFO[e.status].text }); break;
    case 'buff': note(`${who(e.side)}: ${e.text}.`, { side: e.side }); break;
    case 'zero': if (e.bonus > 0) note(`⌖ ${who(e.side)} is zeroing in: +${e.bonus} to its next accuracy roll.`, { side: e.side, detail: `A miss adds Zeroing In (up to +${ZERO_IN_MAX} over several misses). The next accuracy roll uses it up, and it's lost if the creature leaves the field.` }); break;
    case 'send': {
      const c = b.sides[e.side].team.find((x) => x.uid === e.snap.uid);
      // a duel's challenger is a nameless player side, so the challenged trainer's log says "The foe"
      if (c) note(`${mine(e.side) ? 'You send' : view === 1 ? 'The foe sends' : `${b.sides[1].name} sends`} in ${nameOf(c)} (Lv ${c.level}).`, { side: e.side });
      break;
    }
    case 'xp': {
      const c = b.sides[view].team.find((x) => x.uid === e.uid); // only your own creatures' XP
      if (c) note(e.reason === 'ko' ? `${nameOf(c)} gained ${e.amount} XP for knocking out ${e.foe ?? 'its foe'}.` : `${nameOf(c)} gained ${e.amount} XP for battling${e.bonus ? ` (incl. +${e.bonus} trainer battle bonus)` : ''}.`, { tone: 'good', detail: e.levels ? `Reached Lv ${c.level}!` : undefined });
      break;
    }
    case 'end': {
      const r = view === 1 ? flipResult(e.result) : e.result;
      lg.result = r;
      note(e.surrendered !== undefined ? (mine(e.surrendered) ? 'You surrendered.' : 'Victory! The other trainer surrendered.') : r === 'win' ? 'Victory!' : r === 'lose' ? 'Your team is out of creatures.' : r === 'escaped' ? 'Got away safely.' : 'The foe fled.', { tone: r === 'win' || r === 'escaped' ? 'good' : 'bad' });
      break;
    }
    default: break; // 'ko' is already announced by a 'say'
  }
}
