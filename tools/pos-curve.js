// Per positiegroep en attribuut: gemiddelde attribuutwaarde op CA-ankerpunten 80/110/140/170
// (venster ±15; top gepoold 155-195). Vangt de niet-lineaire verzadiging die een lineaire
// slope mist. Output: compacte JS-tabel voor app.js + validatie tegen echte topprofielen.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout', 'dump.json'), 'utf8'));
const players = (d.players || []).filter(p => p.ca >= 55 && p.ca <= 200 && p.attrs);

const HIDDEN = new Set(['Consistency', 'ImportantMatches', 'Versatility', 'InjuryProneness', 'Dirtiness']);
const GROUP_OF = { GK: 'GK', SW: 'DC', DC: 'DC', DL: 'FB', DR: 'FB', WBL: 'FB', WBR: 'FB',
  DM: 'DM', MC: 'MC', ML: 'W', MR: 'W', AML: 'W', AMR: 'W', AMC: 'AMC', ST: 'ST' };
const groupsOf = p => [...new Set((p.posArr || []).map(x => GROUP_OF[x]).filter(Boolean))];

const byGroup = new Map();
byGroup.set('ALL', players.filter(p => !groupsOf(p).includes('GK')));
for (const p of players)
  for (const g of groupsOf(p))
    (byGroup.get(g) || byGroup.set(g, []).get(g)).push(p);

const ANCHORS = [80, 110, 140, 170];
const WINDOWS = [[65, 95], [95, 125], [125, 155], [155, 200]];
const allKeys = Object.keys(players[0].attrs).filter(k => !HIDDEN.has(k));

const table = {};
const anchorN = {};
for (const [g, pl] of [...byGroup.entries()].sort()) {
  table[g] = {};
  anchorN[g] = WINDOWS.map(([lo, hi]) => pl.filter(p => p.ca >= lo && p.ca < hi).length);
  for (const k of allKeys) {
    table[g][k] = WINDOWS.map(([lo, hi]) => {
      let s = 0, n = 0;
      for (const p of pl) {
        if (p.ca < lo || p.ca >= hi) continue;
        const v = p.attrs[k];
        if (v >= 1) { s += v; n++; }
      }
      return n >= 20 ? Math.round(10 * s / n) / 10 : null;
    });
    // Gaten (dunne top): doortrekken met het vorige segment, geklemd 1..20.
    const a = table[g][k];
    for (let i = 0; i < 4; i++)
      if (a[i] == null) a[i] = i >= 2 && a[i - 1] != null && a[i - 2] != null
        ? Math.max(1, Math.min(20, Math.round(10 * (a[i - 1] + (a[i - 1] - a[i - 2]))) / 10))
        : (a[i - 1] ?? 0);
  }
}
console.log('const POS_ATTR_PROFILE = ' + JSON.stringify(table).replace(/"(\w+)":/g, '$1:') + ';');
console.log('\n// Spelers per anker (n):');
for (const [g, ns] of Object.entries(anchorN)) console.log(`//  ${g.padEnd(4)} ${ns.join(' / ')}`);

// ---- Validatie: DC-norm op anker 170 vs echte CA165+-DC's (onafhankelijk gemeten) ----
const ofKeys = allKeys.filter(k => table.ALL[k][3] > 4); // veldspeler-attrs
function meanProfile(pl, keys) {
  const m = {};
  for (const k of keys) { let s = 0, n = 0; for (const p of pl) { const v = p.attrs[k]; if (v >= 1) { s += v; n++; } } m[k] = n ? s / n : 0; }
  return m;
}
const dcTop = players.filter(p => groupsOf(p).includes('DC') && p.ca >= 165);
const top = meanProfile(dcTop, ofKeys);
console.log(`\n// DC-anker-170 vs echt CA165+ (n=${dcTop.length}) — max afwijking:`);
let worst = 0, worstK = '';
for (const k of ofKeys) { const dv = Math.abs(table.DC[k][3] - top[k]); if (dv > worst) { worst = dv; worstK = k; } }
console.log(`//  ${worstK}: ${worst.toFixed(1)} punt`);

// ---- Sinky Petersen door het nieuwe model ----
const sp = players.find(p => /Sinky/i.test(p.name) && /Petersen/i.test(p.name));
if (sp) {
  const interp = (a, ca) => {
    if (ca <= 80) return a[0] - (80 - ca) * (a[1] - a[0]) / 30;
    if (ca >= 170) return a[3] + (ca - 170) * (a[3] - a[2]) / 30;
    for (let i = 1; i < 4; i++) if (ca <= ANCHORS[i])
      return a[i - 1] + (a[i] - a[i - 1]) * (ca - ANCHORS[i - 1]) / 30;
    return a[3];
  };
  const gs = groupsOf(sp).length ? groupsOf(sp) : ['ALL'];
  console.log(`\n// Sinky: CA${sp.ca} PA${sp.pa} pos=${(sp.posArr || []).join('/')} groepen=${gs}`);
  const rows = [];
  let tot = 0;
  for (const k of ofKeys) {
    let dsum = 0;
    for (const g of gs) dsum += Math.max(0, interp(table[g][k], sp.pa) - interp(table[g][k], sp.ca));
    const v = Math.min(20, Math.round(sp.attrs[k] + dsum / gs.length));
    tot += v;
    rows.push(`//  ${k.padEnd(16)} ${String(sp.attrs[k]).padStart(2)} → ${v}`);
  }
  console.log(rows.join('\n'));
  console.log(`// totaal geprojecteerd: ${tot} over ${ofKeys.length} attrs (gem ${(tot / ofKeys.length).toFixed(1)})`);
}
