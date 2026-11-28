// Vertaal-pariteit: elke taal moet exact dezelfde sleutels dragen als 'en'.
// Vangt vergeten sleutels bij nieuwe features (stille terugval naar Engels) en
// zwerfsleutels die nergens meer bestaan. Draai met: node --test
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness');

const M = loadApp();
const LANGS = ['nl', 'fr', 'de', 'zh-CN'];

function assertSameKeys(name, ref, other, lang) {
  assert.ok(other, `${name}.${lang} ontbreekt`);
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
  test(`JOB_LABEL.${lang}: zelfde sleutels als en`, () => assertSameKeys('JOB_LABEL', M.JOB_LABEL.en, M.JOB_LABEL[lang], lang));
}

test('NATIONS: 5 namen + eu-vlag per land, geen lege namen', () => {
  const ids = Object.keys(M.NATIONS);
  assert.ok(ids.length >= 220, `maar ${ids.length} landen`);
  for (const id of ids) {
    const r = M.NATIONS[id];
    assert.equal(r.length, 6, `NATIONS[${id}] heeft ${r.length} velden`);
    for (let i = 0; i < 4; i++) assert.ok(typeof r[i] === 'string' && r[i].length > 0, `NATIONS[${id}][${i}] leeg`);
    assert.ok(r[4] === 0 || r[4] === 1, `NATIONS[${id}] eu-vlag ongeldig`);
    assert.ok(typeof r[5] === 'string' && /\p{Script=Han}/u.test(r[5]), `NATIONS[${id}] Chinese naam ontbreekt`);
  }
});

test('NATIONS: EU-kern klopt, weergave en EU-check via natId', () => {
  assert.deepEqual(M.NATIONS[784], ['Nederland', 'Netherlands', 'Pays-Bas', 'Niederlande', 1, '荷兰']);
  assert.equal(M.NATIONS[1651][4], 0);   // Brazilië geen EU
  assert.equal(M.NATIONS[765][4], 0);    // Engeland geen EU (Brexit)
  const p = { natId: 784, nat: ['whatever'] };
  M.state.lang = 'fr';
  assert.equal(M.natsLabel(p), 'Pays-Bas');
  assert.equal(M.isEu(p), true);
  M.state.lang = 'nl';
  assert.equal(M.isEu({ natId: 1651 }), false);
  M.state.lang = 'zh-CN';
  assert.equal(M.natsLabel(p), '荷兰');
  assert.equal(M.natsLabel({ nat: ['Netherlands'] }), '荷兰');
  assert.equal(M.isEu({ nat: ['荷兰'] }), true);
  // fallback zonder natId: op naam (oude dumps)
  assert.equal(M.isEu({ nat: ['Netherlands'] }), true);
});

test('uses Simplified Chinese by default in a Simplified Chinese Windows browser', () => {
  assert.equal(loadApp({ language: 'zh-CN', platform: 'Win32' }).state.lang, 'zh-CN');
  assert.equal(loadApp({ language: 'zh-Hans-SG', platform: 'Win32' }).state.lang, 'zh-CN');
  assert.equal(loadApp({ language: 'zh-TW', platform: 'Win32' }).state.lang, 'nl');
  assert.equal(loadApp({ language: 'zh-CN', platform: 'MacIntel' }).state.lang, 'nl');
});

test('all supported saved languages override the Windows browser language', () => {
  for (const lang of ['en', ...LANGS]) {
    assert.equal(loadApp({ language: 'zh-CN', platform: 'Win32', savedLanguage: lang }).state.lang, lang);
  }
  assert.equal(loadApp({ language: 'en-US', platform: 'Win32', savedLanguage: 'zh-CN' }).state.lang, 'zh-CN');
  assert.equal(loadApp({ language: 'zh-CN', platform: 'Win32', savedLanguage: 'invalid' }).state.lang, 'zh-CN');
});

test('name and club searches match either script and keep game display strings', () => {
  const controls = { 'f-name': { value: '' } };
  const app = loadApp({ controls });
  const player = { id: 2, name: '张玉宁', club: '北京国安', nameAliases: ['Zhang Yuning'], clubAliases: ['Beijing Guoan'], age: 27 };
  app.state.players = [player, { id: 3, name: '王大雷', club: '山东泰山', age: 32 }];
  for (const search of ['玉宁', 'YUNING', '国安', 'beijing guo']) {
    controls['f-name'].value = search;
    app.applyFilters();
    assert.deepEqual(app.state.filtered, [player]);
    assert.equal(app.state.filtered[0].name, '张玉宁');
    assert.equal(app.state.filtered[0].club, '北京国安');
  }
});

test('division search matches the game’s short, full, and alternate names', () => {
  const controls = { 'f-div': { value: '' } };
  const app = loadApp({ controls });
  const player = { id: 2, name: '张玉宁', div: '中国足球超级联赛', divisionShort: '中超联赛', divisionAliases: ['Chinese Super League'], age: 27 };
  app.state.players = [player, { id: 3, name: '其他球员', div: '其他联赛', age: 27 }];
  for (const search of ['中国足球', '中超', 'Chinese super']) {
    controls['f-div'].value = search;
    app.applyFilters();
    assert.deepEqual(app.state.filtered, [player]);
  }
});

test('only confirmed free agents enter the free-agent filter', () => {
  const app = loadApp({ savedLanguage: 'en', controls: { 'f-contract': { value: 'free' } } });
  app.state.players = [
    { id: 1, name: '旧数据', age: 22 },
    { id: 2, name: '俱乐部待确认', age: 25, clubStatus: 'unknown' },
    { id: 3, name: '约定转会', age: 26, clubStatus: 'free', transferTo: '北京国安' },
    { id: 4, name: '自由球员', age: 26, clubStatus: 'free' },
    { id: 5, name: '效力中', age: 24, club: '上海海港', clubStatus: 'known' },
  ];
  app.applyFilters();
  assert.deepEqual(app.state.filtered.map(p => p.id), [4]);
  assert.match(app.clubLabel(app.state.players[0]), /unknown club/);
  assert.match(app.clubLabel(app.state.players[2]), /data-help="clubless"/);
  assert.equal(app.clubLabel(app.state.players[4]), '上海海港');
});

test('Chinese shortlist and player card preserve names and localize their labels', () => {
  const app = loadApp({ savedLanguage: 'zh-CN' });
  const player = { id: 4, name: '张玉宁', club: '北京国安', natId: 110, age: 27, ca: 120, pa: 130, attrs: { Finishing: 15 } };
  const csv = app.buildShortlistCsv([player]);
  assert.ok(csv.startsWith('\uFEFF姓名,位置,年龄,俱乐部,国籍,'));
  assert.match(csv, /"张玉宁".*"北京国安","中国"/);
  const card = app.buildCardModel(player);
  assert.equal(card.name, '张玉宁');
  assert.equal(card.club, '北京国安');
  assert.equal(card.nation, '中国');
  assert.ok(card.groups[0][1].some(([name]) => name === '射门'));
  assert.equal(card.L.wage, '工资');
  assert.equal(app.fmtDate('2031-10-09'), '2031年10月9日');
});

test('Chinese shortlist distinguishes a confirmed free agent from an unresolved club', () => {
  const app = loadApp({ savedLanguage: 'zh-CN' });
  const csv = app.buildShortlistCsv([
    { name: '自由球员示例', age: 23, pos: 'ST', clubStatus: 'free' },
    { name: '旧数据示例', age: 25, pos: 'ST' },
  ]);
  assert.match(csv, /"自由球员示例","前锋","23","自由球员"/);
  assert.match(csv, /"旧数据示例","前锋","25","俱乐部未知"/);
});

test('Chinese position labels preserve the filtering codes and localize table, profile, and exports', () => {
  const app = loadApp({ savedLanguage: 'zh-CN' });
  const forward = { id: 1, name: '前锋示例', pos: 'ST, AML', posArr: ['ST', 'AML'], posNat: ['ST'], age: 23 };
  const keeper = { id: 2, name: '门将示例', pos: 'GK', posArr: ['GK'], age: 23 };
  app.state.players = [forward, keeper];
  app.activePos.add('AML');
  app.applyFilters();
  assert.deepEqual(app.state.filtered, [forward]);
  assert.match(app.posHtml(forward), /data-tip="前锋、左前腰"/);
  assert.match(app.posHtml(forward), />左前</);
  assert.match(app.posHtml(forward, false), /class="pos-term pos-acc"[^>]*>左前腰</);
  assert.match(app.buildShortlistCsv([forward]), /"前锋、左前腰"/);
  assert.equal(app.buildCardModel(forward).positions, '前锋');
  app.state.lang = 'en';
  assert.match(app.posHtml(forward), />AML</);
  assert.match(app.buildShortlistCsv([forward]), /"ST, AML"/);
});

test('in-game dates in the toolbar keep the dump day in western time zones', () => {
  const gameDate = { innerHTML: '' };
  const app = loadApp({ savedLanguage: 'zh-CN', controls: { 'game-date': gameDate } });
  const oldTz = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    app.state.dumpStamp = '2031-10-01T05:00:00Z';
    app.state.meta = { gameDate: '2031-10-09', gameDateSource: 'memory' };
    app.renderDumpInfo();
    assert.match(gameDate.innerHTML, /2031年10月9日/);
  } finally {
    if (oldTz === undefined) delete process.env.TZ;
    else process.env.TZ = oldTz;
  }
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

test('i18n: geen lege vertaalwaarden', () => {
  for (const lang of ['en', ...LANGS])
    for (const [k, v] of Object.entries(M.I18N[lang] || {}))
      assert.ok(typeof v === 'string' && v.length > 0, `I18N.${lang}.${k} is leeg`);
});

test('i18n: stafattributen hebben een label in elke taal, voor elke gedumpte sleutel', () => {
  const keys = M.STAFF_ATTR_GROUPS.flatMap(([, ks]) => ks);
  assert.equal(new Set(keys).size, 22, '21 stafattributen + Aanpassingsvermogen (KV_vangen bewust verborgen)');
  for (const lang of Object.keys(M.I18N)) {
    for (const k of keys) assert.ok(M.STAFF_ATTR_LABEL[lang]?.[k], `${lang}: label ontbreekt voor ${k}`);
    for (const [g] of M.STAFF_ATTR_GROUPS) assert.ok(M.I18N[lang][g], `${lang}: groepnaam ${g} ontbreekt`);
  }
});
