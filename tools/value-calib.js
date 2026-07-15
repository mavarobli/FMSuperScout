// Kalibratie: geheugenwaarde (×1,16 £→€) vs in-game getoonde transferwaarde-bandbreedtes.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout', 'dump.json'), 'utf8'));
const players = d.players || [];

// [zoeknaam, lo (€M), hi (€M of null = vaste vraagprijs)]
const CALIB = [
  // Scoutinglijst (duur)
  ['Kharebashvili', 114, 141], ['Leo Sauer', 110, 125], ['Kanta Doi', 101, 114],
  ['Gilberto Mora', 95, 131], ['Givairo Read', 62, 70], ['Armando Pires', 55, 68],
  ['Sangant', 39, 43], ['Hamza Abdelkarim', 38, 46], ['Zagadou', 35, 44],
  ['Urbański', 30, 38], ['van Persie', 30, 35], ['Mamour N’Diaye', 28, 32],
  ['Zechiël', 27, 35], ['Aymen Sliti', 25, 29], ['Schuhmacher', 23, 29],
  ['In-Beom', 21, 25], ['Pérez Vinlöf', 21, 24], ['Kazuto Kimura', 17.5, 26],
  ['Jaden Slory', 16.5, 21], ['Mamady Diambou', 11.5, 14],
  // Wereldtop
  ['Mbappé', 294, 352], ['Haaland', 262, 286], ['Julián Álvarez', 241, 264],
  ['Estêvão', 223, 245], ['Álex Baena', 223, 243], ['Vinícius Júnior', 219, 263],
  ['Pavlović', 216, 259], ['Phil Foden', 208, 249], ['Pedri', 207, 228],
  ['Bellingham', 193, 212], ['Lewis-Skelly', 192, 230], ['Enzo Fernández', 190, 211],
  ['Vitinha', 175, 229], ['Kerkez', 175, 193], ['Cole Palmer', 171, 224],
  // Telstar (goedkoop); null = club heeft vaste vraagprijs
  ['Sapoko Ndiaye', 2.4, 4.9], ['Oudsten', 0.8, 1.7], ['Cornelisse', 0.75, 1.6],
  ['Joachims', 0.45, 1.3], ['Koswal', 0.4, 4], ['Sam Schreck', 0.35, 1],
  ['Hetli', 0.35, null], ['Luuk Wouters', 0.275, 0.8], ['Tyrone Owusu', 0.24, 0.7],
  ['Nils Rossen', 0.21, 2.1], ['Kay Tejan', 0.21, 2.1], ['Patrick Brouwer', 0.17, null],
  ['Agrafiotis', 0.11, 1.1], ['Van Hauter', 0.11, 0.325], ['Arturo Rodríguez', 0.11, null],
  ['Offerhaus', 0.1, 1], ['Kaj de Rooij', 0.1, 1], ['Jeff Hardeveld', 0.1, null],
  ['Boris Lambert', 0.095, 0.95], ['Adam Carlén', 0.09, 0.9], ['Philipp Ochs', 0.075, 0.75],
  ['Platret', 0.035, 0.375], ['Zinho Gano', 0.028, 0.275],
  // Het twistpunt zelf
  ['Nobel Mendy', 17.5, 21],
];

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const M = 1e6;
let inN = 0, outN = 0;
console.log('speler                    | raw £      |  ×1,16 €M | in-game €M    | oordeel  (v/mid)');
for (const [q, lo, hi] of CALIB) {
  const cand = players.filter(p => norm(p.name).includes(norm(q)));
  if (!cand.length) { console.log(`${q.padEnd(25)} | NIET GEVONDEN`); continue; }
  // bij meerdere: hoogste CA
  const p = cand.sort((a, b) => b.ca - a.ca)[0];
  const eur = p.value > 0 ? p.value * 1.16 / M : null;
  const mid = hi == null ? lo : (lo + hi) / 2;
  let verdict;
  if (eur == null) verdict = 'geen waarde (sentinel)';
  else if (hi == null) verdict = `vaste prijs; v=${eur.toFixed(2)} (${(eur / lo).toFixed(2)}× prijs)`;
  else if (eur >= lo && eur <= hi) { verdict = 'BINNEN'; inN++; }
  else { verdict = `BUITEN ${(eur / mid).toFixed(2)}× mid`; outN++; }
  console.log(`${p.name.padEnd(25)} | ${String(p.value).padStart(10)} | ${eur == null ? '     null' : eur.toFixed(1).padStart(9)} | ${(lo + (hi ? '-' + hi : ' vast')).padEnd(13)} | ${verdict}`);
}
console.log(`\nBinnen bandbreedte: ${inN} · buiten: ${outN}`);
