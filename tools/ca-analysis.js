// Analyse: hoe verhouden attribuutpunten zich tot CA in de echte FM-database?
// Doel: empirische kalibratie van de potentie-projectie.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const dump = JSON.parse(fs.readFileSync(
  path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout', 'dump.json'), 'utf8'));
const players = dump.players || [];

// Zichtbare attributen zoals de detailweergave ze toont (geen verborgen attrs).
const HIDDEN = new Set(['Consistency', 'ImportantMatches', 'Versatility', 'InjuryProneness', 'Dirtiness']);
const GK_ATTRS = new Set(['Handling', 'AerialReach', 'CommandOfArea', 'Communication', 'Kicking',
  'Throwing', 'OneOnOnes', 'Reflexes', 'RushingOut', 'Punching', 'Eccentricity']);

const isGk = p => (p.posArr || []).includes('GK');

// Relevante zichtbare attribuutset per speler (zoals in de app getoond/geprojecteerd).
function relKeys(p) {
  return Object.keys(p.attrs || {}).filter(k => !HIDDEN.has(k) && (isGk(p) ? true : !GK_ATTRS.has(k)));
}

function stats(arr) {
  const n = arr.length;
  if (!n) return null;
  const mean = arr.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / n);
  return { n, mean, sd };
}

// ---- 1. Per CA-bucket: totaal, aantal 20s, ≥16s, top-5-gemiddelde ----
function bucketReport(group, label) {
  console.log(`\n=== ${label} (n=${group.length}) ===`);
  console.log('CA-bucket |    n  | attrs | totaal (sd)     | gem/attr | #20  | #>=16 | top5-gem | gem lft');
  for (let lo = 60; lo < 200; lo += 10) {
    const hi = lo + 10;
    const g = group.filter(p => p.ca >= lo && p.ca < hi);
    if (g.length < 25) continue;
    const totals = [], n20 = [], n16 = [], top5 = [], nAttrs = [];
    for (const p of g) {
      const ks = relKeys(p);
      const vals = ks.map(k => p.attrs[k]);
      totals.push(vals.reduce((s, v) => s + v, 0));
      n20.push(vals.filter(v => v >= 20).length);
      n16.push(vals.filter(v => v >= 16).length);
      top5.push(vals.sort((a, b) => b - a).slice(0, 5).reduce((s, v) => s + v, 0) / 5);
      nAttrs.push(ks.length);
    }
    const t = stats(totals), ages = stats(g.map(p => p.age).filter(a => a > 0));
    console.log(`${String(lo).padStart(3)}-${String(hi).padEnd(3)}   | ${String(g.length).padStart(5)} | ${stats(nAttrs).mean.toFixed(0).padStart(5)} | ${t.mean.toFixed(1).padStart(6)} (${t.sd.toFixed(1).padStart(5)}) | ${(t.mean / stats(nAttrs).mean).toFixed(2).padStart(8)} | ${stats(n20).mean.toFixed(2).padStart(4)} | ${stats(n16).mean.toFixed(2).padStart(5)} | ${stats(top5).mean.toFixed(1).padStart(8)} | ${ages ? ages.mean.toFixed(1) : '?'}`);
  }
  // Lineaire regressie totaal ~ CA
  const pts = group.filter(p => p.ca >= 40).map(p => {
    const ks = relKeys(p);
    return [p.ca, ks.reduce((s, k) => s + p.attrs[k], 0)];
  });
  const n = pts.length;
  const mx = pts.reduce((s, q) => s + q[0], 0) / n, my = pts.reduce((s, q) => s + q[1], 0) / n;
  let sxy = 0, sxx = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  const b = sxy / sxx, a = my - b * mx;
  const r = sxy / Math.sqrt(sxx * pts.reduce((s, q) => s + (q[1] - my) ** 2, 0));
  console.log(`Regressie: totaal = ${a.toFixed(1)} + ${b.toFixed(3)} × CA   (r=${r.toFixed(3)}, n=${n})`);
  return { a, b };
}

const outfield = players.filter(p => p.ca > 0 && p.attrs && !isGk(p));
const gks = players.filter(p => p.ca > 0 && p.attrs && isGk(p));
const of = bucketReport(outfield, 'VELDSPELERS (36 zichtbare attrs)');
const gk = bucketReport(gks, 'KEEPERS (alle 47 zichtbare attrs)');

// ---- 2. Leeftijdseffect: zelfde CA, andere leeftijd → ander totaal? ----
console.log('\n=== Leeftijdseffect binnen CA 120-140 (veldspelers) ===');
for (const [lo, hi] of [[15, 19], [20, 23], [24, 27], [28, 31], [32, 40]]) {
  const g = outfield.filter(p => p.ca >= 120 && p.ca < 140 && p.age >= lo && p.age <= hi);
  if (g.length < 20) continue;
  const totals = g.map(p => relKeys(p).reduce((s, k) => s + p.attrs[k], 0));
  console.log(`lft ${lo}-${hi}: n=${String(g.length).padStart(5)}  totaal=${stats(totals).mean.toFixed(1)}`);
}

// ---- 3. Wat betekent dit voor de projectie? Voorbeeld: hoge-PA-tieners ----
console.log('\n=== Voorbeeld: proportioneel (huidig) vs empirisch budget ===');
const kids = outfield.filter(p => p.age > 0 && p.age <= 18 && p.pa - p.ca >= 60).slice(0, 8);
for (const p of kids) {
  const ks = relKeys(p);
  const tot = ks.reduce((s, k) => s + p.attrs[k], 0);
  const propBudget = tot * (p.pa / p.ca - 1);
  const empBudget = of.b * (p.pa - p.ca);
  console.log(`${p.name.padEnd(24)} CA${String(p.ca).padStart(3)} PA${String(p.pa).padStart(3)} tot=${tot}  proportioneel:+${propBudget.toFixed(0)}  empirisch:+${empBudget.toFixed(0)} punten`);
}

// ---- 4. Attribuutverdeling bij topspelers: hoeveel 20s heeft CA 180+ echt? ----
console.log('\n=== Attribuutverdeling per waarde, veldspelers CA 170+ vs CA 90-110 ===');
for (const [lo, hi, label] of [[170, 201, 'CA 170+'], [90, 111, 'CA 90-110']]) {
  const g = outfield.filter(p => p.ca >= lo && p.ca < hi);
  const hist = new Array(21).fill(0);
  let tot = 0;
  for (const p of g) for (const k of relKeys(p)) { hist[p.attrs[k]]++; tot++; }
  const pct = v => (100 * hist[v] / tot).toFixed(1);
  console.log(`${label} (n=${g.length}): 20:${pct(20)}%  19:${pct(19)}%  18:${pct(18)}%  17:${pct(17)}%  16:${pct(16)}%  13-15:${((100 * (hist[13] + hist[14] + hist[15])) / tot).toFixed(1)}%  <=12:${((100 * hist.slice(0, 13).reduce((s, x) => s + x, 0)) / tot).toFixed(1)}%`);
}

// Sinky Petersen zelf
const sp = players.find(p => /Petersen/i.test(p.name) && /Sink/i.test(p.name));
if (sp) {
  const ks = relKeys(sp);
  console.log(`\nSinky Petersen: CA=${sp.ca} PA=${sp.pa} lft=${sp.age} totaal=${ks.reduce((s, k) => s + sp.attrs[k], 0)} over ${ks.length} attrs`);
}
