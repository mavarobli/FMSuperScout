// Vertaal-pariteit: elke taal moet exact dezelfde sleutels dragen als 'en'.
// Vangt vergeten sleutels bij nieuwe features (stille terugval naar Engels) en
// zwerfsleutels die nergens meer bestaan. Draai met: node --test
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness');

const M = loadApp();
const LANGS = ['nl', 'fr', 'de'];

function assertSameKeys(name, ref, other, lang) {
  const a = Object.keys(ref).sort(), b = Object.keys(other).sort();
  const missing = a.filter(k => !b.includes(k));
  const extra = b.filter(k => !a.includes(k));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] },
    `${name}.${lang}: ontbrekend=[${missing}] overbodig=[${extra}]`);
}

for (const lang of LANGS) {
  test(`I18N.${lang}: zelfde sleutels als en`, () => assertSameKeys('I18N', M.I18N.en, M.I18N[lang], lang));
  test(`ATTR_LABEL.${lang}: zelfde sleutels als en`, () => assertSameKeys('ATTR_LABEL', M.ATTR_LABEL.en, M.ATTR_LABEL[lang], lang));
  test(`STAFF_ATTR_LABEL.${lang}: same keys as en`, () => assertSameKeys('STAFF_ATTR_LABEL', M.STAFF_ATTR_LABEL.en, M.STAFF_ATTR_LABEL[lang], lang));
  test(`ROLE_LABEL.${lang}: zelfde sleutels als en`, () => assertSameKeys('ROLE_LABEL', M.ROLE_LABEL.en, M.ROLE_LABEL[lang], lang));
  test(`CARDL.${lang}: zelfde sleutels als en`, () => assertSameKeys('CARDL', M.CARDL.en, M.CARDL[lang], lang));
  test(`JOB_LABEL.${lang}: zelfde sleutels als en`, () => assertSameKeys('JOB_LABEL', M.JOB_LABEL.en, M.JOB_LABEL[lang], lang));
}

test('NATIONS: 4 namen + eu-vlag per land, geen lege namen', () => {
  const ids = Object.keys(M.NATIONS);
  assert.ok(ids.length >= 220, `maar ${ids.length} landen`);
  for (const id of ids) {
    const r = M.NATIONS[id];
    assert.equal(r.length, 5, `NATIONS[${id}] heeft ${r.length} velden`);
    for (let i = 0; i < 4; i++) assert.ok(typeof r[i] === 'string' && r[i].length > 0, `NATIONS[${id}][${i}] leeg`);
    assert.ok(r[4] === 0 || r[4] === 1, `NATIONS[${id}] eu-vlag ongeldig`);
  }
});

test('NATIONS: EU-kern klopt, weergave en EU-check via natId', () => {
  assert.deepEqual(M.NATIONS[784], ['Nederland', 'Netherlands', 'Pays-Bas', 'Niederlande', 1]);
  assert.equal(M.NATIONS[1651][4], 0);   // Brazilië geen EU
  assert.equal(M.NATIONS[765][4], 0);    // Engeland geen EU (Brexit)
  const p = { natId: 784, nat: ['whatever'] };
  M.state.lang = 'fr';
  assert.equal(M.natsLabel(p), 'Pays-Bas');
  assert.equal(M.isEu(p), true);
  M.state.lang = 'nl';
  assert.equal(M.isEu({ natId: 1651 }), false);
  // fallback zonder natId: op naam (oude dumps)
  assert.equal(M.isEu({ nat: ['Netherlands'] }), true);
});

test('jobLabel: vertaalt via jobId, valt terug op dumpstring', () => {
  M.state.lang = 'de';
  assert.equal(M.jobLabel({ jobId: 34, job: 'Keeperstrainer' }), 'Torwarttrainer');
  assert.equal(M.jobLabel({ job: 'Staflid' }), 'Mitarbeiter');
  assert.equal(M.jobLabel({ job: 'Onbekende functie' }), 'Onbekende functie');
  M.state.lang = 'nl';
});

test('fmtWage: periode-omrekening vanaf weekloon', () => {
  M.state.cur = '£'; M.state.wagePer = 'w';
  assert.equal(M.wageFactor(), 1);
  M.state.wagePer = 'y';
  assert.equal(M.wageFactor(), 52);
  M.state.wagePer = 'm';
  assert.ok(Math.abs(M.wageFactor() - 52 / 12) < 1e-9);
  M.state.wagePer = 'w';
});

test('staffAttrName: translates staff attributes per language', () => {
  M.state.lang = 'en';
  assert.equal(M.staffAttrName('Aanvallen'), 'Attacking');
  assert.equal(M.staffAttrName('Oordeel_vermogen'), 'Judging Player Ability');
  M.state.lang = 'de';
  assert.equal(M.staffAttrName('Aanvallen'), 'Angriffsspiel');
  assert.equal(M.staffAttrName('Tactische_kennis'), 'Taktikkenntnisse');
  M.state.lang = 'fr';
  assert.equal(M.staffAttrName('Fysiotherapie'), 'Kinésithérapie');
  M.state.lang = 'nl';
  assert.equal(M.staffAttrName('Oordeel_potentie'), 'Oordeel potentie');
});

test('i18n: geen lege vertaalwaarden', () => {
  for (const lang of ['en', ...LANGS]) {
    for (const [k, v] of Object.entries(M.I18N[lang]))
      assert.ok(typeof v === 'string' && v.length > 0, `I18N.${lang}.${k} is leeg`);
    for (const [k, v] of Object.entries(M.STAFF_ATTR_LABEL[lang]))
      assert.ok(typeof v === 'string' && v.length > 0, `STAFF_ATTR_LABEL.${lang}.${k} is leeg`);
  }
});
