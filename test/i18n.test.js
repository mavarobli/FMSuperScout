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
  test(`ROLE_LABEL.${lang}: zelfde sleutels als en`, () => assertSameKeys('ROLE_LABEL', M.ROLE_LABEL.en, M.ROLE_LABEL[lang], lang));
  test(`CARDL.${lang}: zelfde sleutels als en`, () => assertSameKeys('CARDL', M.CARDL.en, M.CARDL[lang], lang));
}

test('i18n: geen lege vertaalwaarden', () => {
  for (const lang of ['en', ...LANGS])
    for (const [k, v] of Object.entries(M.I18N[lang]))
      assert.ok(typeof v === 'string' && v.length > 0, `I18N.${lang}.${k} is leeg`);
});
