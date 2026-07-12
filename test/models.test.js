// Modeltests voor FMSuperScout — draai met:  node --test
// Zero-dependency (node:test + node:assert), past bij de rest van de stack.
// We testen de ECHTE functies uit app/app.js via het harnas. Dit vangt regressies bij het
// bijstellen van de reken-modellen (waarde/interesse/potentie/rol) zonder handmatig herijken.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness');

const M = loadApp();
// Vaste context i.p.v. localStorage/dump: peiljaar en valuta bekend maken.
M.state.cur = '£';
M.state.refYear = 2027;
M.state.refDoy = 1;
M.state.meta = { gameDate: '2027-01-01', gameYear: 2027, myClub: 'Testclub', myClubRep: 6000 };
M.state.players = [];

// Representatieve speler; velden zoals de plugin ze dumpt.
function player(over = {}) {
  return Object.assign({
    id: 1, name: 'Test Speler', birthYear: 2006, birthDoy: 1, age: 21,
    club: 'Andere Club', clubRep: 3000, worldRep: 2000, wage: 20000,
    ca: 120, pa: 150, pos: 'ST', posArr: ['ST'], nat: ['Netherlands'], foot: 'Rechts',
    value: 5_000_000, expires: '2028-06-30',
    attrs: {
      Finishing: 14, Passing: 11, Technique: 13, FirstTouch: 13, Dribbling: 12, Marking: 5, Tackling: 6,
      Composure: 13, Decisions: 12, Determination: 14, OffTheBall: 13, Anticipation: 12, WorkRate: 12,
      Pace: 15, Acceleration: 15, Strength: 12, Stamina: 13, Agility: 13, Balance: 12,
      Corners: 6, FreeKicks: 7,
      Consistency: 14, ImportantMatches: 12, InjuryProneness: 8, Versatility: 10, Dirtiness: 5,
    },
  }, over);
}

// ---------- parseMoney ----------
test('parseMoney: eenheden en randgevallen (£)', () => {
  assert.equal(M.parseMoney('10M'), 10_000_000);
  assert.equal(M.parseMoney('50K'), 50_000);
  assert.equal(M.parseMoney('1.8m'), 1_800_000);
  assert.equal(M.parseMoney('2mld'), 2_000_000_000);
  assert.equal(M.parseMoney('1,5M'), 1_500_000);   // komma als decimaal
  assert.equal(M.parseMoney(''), null);
  assert.equal(M.parseMoney('   '), null);
});

// ---------- monthsUntil ----------
test('monthsUntil: t.o.v. in-game datum', () => {
  assert.equal(M.monthsUntil(null), null);
  const half = M.monthsUntil('2027-07-01');   // ~6 maanden na 2027-01-01
  assert.ok(half > 5.5 && half < 6.5, `verwacht ~6, kreeg ${half}`);
  assert.ok(M.monthsUntil('2026-07-01') < 0, 'verleden = negatief');
});

// ---------- projectAttrs (potentie) ----------
test('projectAttrs: PA<=CA geeft geen projectie', () => {
  assert.equal(M.projectAttrs(player({ ca: 150, pa: 150 })), null);
  assert.equal(M.projectAttrs(player({ ca: 150, pa: 120 })), null);
});

test('projectAttrs: groeit, blijft <=20, laat verborgen kenmerken met rust', () => {
  const p = player({ ca: 100, pa: 160, age: 18 });
  const proj = M.projectAttrs(p);
  for (const k of Object.keys(p.attrs)) {
    if (['Consistency', 'ImportantMatches', 'Versatility', 'InjuryProneness', 'Dirtiness'].includes(k)) {
      assert.equal(proj[k], undefined, `verborgen kenmerk ${k} mag niet geprojecteerd worden`);
    } else {
      assert.ok(proj[k] >= p.attrs[k], `${k} mag niet dalen`);
      assert.ok(proj[k] <= 20, `${k} mag niet boven 20`);
    }
  }
});

test('projectAttrs: fysiek bevriest bij oudere speler, mentaal groeit door', () => {
  // Leeftijd via birthYear (getAge geeft birthYear voorrang boven het age-veld). refYear = 2027.
  const young = M.projectAttrs(player({ ca: 145, pa: 162, birthYear: 2005 }));   // 22
  const old = M.projectAttrs(player({ ca: 145, pa: 162, birthYear: 1996 }));     // 31
  const baseAttrs = player().attrs;
  const base = { attrs: baseAttrs };
  // Snelheidsgroei jong > oud (bij oud vrijwel bevroren)
  const paceGrowYoung = young.Pace - base.attrs.Pace;
  const paceGrowOld = old.Pace - base.attrs.Pace;
  assert.ok(paceGrowYoung >= paceGrowOld, 'jonge speler groeit fysiek minstens zo hard als oude');
  assert.ok(paceGrowOld <= 1, 'oude speler wint nauwelijks snelheid');
  // Mentale groei bij de oudere speler nog aanwezig
  assert.ok(old.Determination >= base.attrs.Determination, 'mentaal groeit ook op leeftijd');
});

// ---------- estValue ----------
test('estValue: echte in-game waarde komt er 1:1 uit (geen schatting)', () => {
  const ev = M.estValue(player({ value: 8_000_000 }));
  assert.equal(ev.v, 8_000_000);
  assert.equal(ev.est, false);
});

test('estValue: zonder echte waarde schat het een positief bereik', () => {
  const ev = M.estValue(player({ value: 0, worldRep: 4000 }));
  assert.equal(ev.est, true);
  assert.ok(ev.v == null || ev.v >= 0);
  // hogere reputatie => hogere schatting
  const lo = M.estValue(player({ value: 0, worldRep: 1000 }));
  const hi = M.estValue(player({ value: 0, worldRep: 7000 }));
  assert.ok(hi.v >= lo.v, 'meer reputatie => hogere schatting');
});

// ---------- interestEstimate ----------
test('interestEstimate: onbekende leeftijd wordt NIET als minderjarige behandeld', () => {
  const unknown = M.interestEstimate(player({ age: 0, birthYear: 0 }));
  assert.ok(unknown && unknown.note !== 'minor', 'age 0 mag geen minor-cap krijgen');
  assert.ok(unknown.score > 6, `onbekende leeftijd mag niet op minor-cap (6) blijven, kreeg ${unknown.score}`);
  const realMinor = M.interestEstimate(player({ age: 14, birthYear: 2013 }));
  assert.equal(realMinor.note, 'minor');
  assert.ok(realMinor.score <= 6);
});

test('interestEstimate: eigen speler => null', () => {
  assert.equal(M.interestEstimate(player({ club: 'Testclub' })), null);
});

// ---------- roleScore ----------
test('roleScore: betere attributen => hogere rolscore', () => {
  const roles = M.ROLES || [];
  assert.ok(roles.length, 'er zijn rollen gedefinieerd');
  const role = roles[0];
  const weak = player();
  const strong = player();
  for (const k of Object.keys(strong.attrs)) strong.attrs[k] = Math.min(20, weak.attrs[k] + 4);
  const sWeak = M.roleScore(weak, role);
  const sStrong = M.roleScore(strong, role);
  assert.ok(sStrong >= sWeak, `sterker profiel moet minstens even hoog scoren (${sStrong} vs ${sWeak})`);
});
