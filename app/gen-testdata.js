// Genereert een fake dump om de UI mee te testen (structuur = echte plugin-output).
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUT = path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout');
fs.mkdirSync(OUT, { recursive: true });

const FIRST = ['Jari', 'Sem', 'Luuk', 'Milan', 'Kees', 'Diego', 'Luca', 'Marco', 'Pedro', 'João', 'Kylian', 'Erling', 'Youri', 'Sven', 'Tijs', 'Bram', 'Nico', 'Rafa', 'Andri', 'Tom'];
const LAST = ['Jansen', 'de Vries', 'van Dijk', 'Silva', 'Santos', 'Müller', 'García', 'Rossi', 'Kowalski', 'Eriksen', 'Berg', 'Timber', 'Botman', 'Nielsen', 'Costa', 'Moreno', 'Novak', 'Petrov', 'Yilmaz', 'Karlsson'];
// club → reputatie (~0..10000) voor het testen van de interesse-inschatting
const CLUB_REP = { Feyenoord: 7200, Ajax: 7900, PSV: 7400, AZ: 6000, 'FC Twente': 5200, 'Real Madrid': 9700, Barcelona: 9500, Bayern: 9400, Dortmund: 8600, Liverpool: 9200, Arsenal: 8900, Chelsea: 9000, Inter: 8700, Milan: 8600, PSG: 8800, Benfica: 7600, Porto: 7500, 'Club Brugge': 6200, Anderlecht: 5800, Celtic: 6400 };
const CLUBS = [...Object.keys(CLUB_REP), null];
const NATS = ['Nederland', 'België', 'Duitsland', 'Spanje', 'Frankrijk', 'Engeland', 'Italië', 'Portugal', 'Brazilië', 'Argentinië', 'Denemarken', 'Zweden', 'Noorwegen', 'Turkije', 'Polen', 'Kroatië'];
const POS_SETS = [['GK'], ['DC'], ['DC', 'DR'], ['DL', 'WBL'], ['DM', 'MC'], ['MC'], ['MC', 'AMC'], ['AMR', 'ST'], ['AML'], ['ST'], ['AMC', 'ST'], ['DR', 'WBR', 'MR']];
const JOBS = ['Assistent-manager', 'Coach', 'Fitnesscoach', 'Keeperstrainer', 'Scout', 'Fysiotherapeut', 'Data-analist'];
const TECH = ['Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'FreeKicks', 'Heading', 'LongShots', 'LongThrows', 'Marking', 'Passing', 'PenaltyTaking', 'Tackling', 'Technique'];
const GK = ['AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'Handling', 'Kicking', 'OneOnOnes', 'Punching', 'Reflexes', 'RushingOut', 'Throwing'];
const MENT = ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'];
const PHYS = ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength'];

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[ri(0, a.length - 1)];

function isoPlus(months) {
  const d = new Date('2026-07-11');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function player(id) {
  const posArr = pick(POS_SETS);
  const isGk = posArr[0] === 'GK';
  const ca = ri(40, 195), pa = Math.min(200, ca + ri(0, 45));
  const age = ri(15, 38);
  const club = pick(CLUBS);
  const attrs = {};
  const lvl = ca / 200;
  const rand20 = () => Math.max(1, Math.min(20, Math.round(lvl * 16 + ri(-3, 4))));
  (isGk ? GK : TECH).forEach(k => attrs[k] = rand20());
  MENT.forEach(k => attrs[k] = rand20());
  PHYS.forEach(k => attrs[k] = rand20());
  // waarde: net als de echte plugin bijna altijd null (FM berekent 'm live)
  const value = Math.random() < 0.9 ? null : Math.round(Math.pow(ca / 30, 4) * 1000);
  return {
    id, name: pick(FIRST) + ' ' + pick(LAST),
    age, dob: String(2026 - age), birthYear: 2026 - age, birthDoy: ri(1, 365),
    nat: [pick(NATS)],
    club, div: null,
    pos: posArr.join(', '), posArr,
    foot: pick(['Links', 'Rechts', 'Beide']),
    height: ri(165, 200),
    ca, pa,
    value, wage: club ? ri(500, 400000) : null,
    expires: club ? isoPlus(pick([2, 4, 8, 12, 24, 36])) : null,
    listed: Math.random() < 0.08,
    setForRelease: Math.random() < 0.04,
    notForSale: Math.random() < 0.15,
    clubRep: club ? CLUB_REP[club] : 0,
    worldRep: Math.round(ca * 45 + ri(-500, 500)),
    ambition: ri(5, 20), loyalty: ri(1, 20), professionalism: ri(3, 20), adaptability: ri(5, 20),
    pressure: ri(3, 20), sportsmanship: ri(3, 20), temperament: ri(3, 20), controversy: ri(1, 18),
    attrs,
  };
}

function staff(id) {
  const ca = ri(40, 195), pa = Math.min(200, ca + ri(0, 30));
  const club = pick(CLUBS);
  return {
    id, name: pick(FIRST) + ' ' + pick(LAST),
    age: ri(28, 68), dob: null, nat: [pick(NATS)], club, job: pick(JOBS),
    ca, pa, wage: club ? ri(300, 80000) : null,
    expires: club ? isoPlus(pick([6, 12, 24])) : null,
    staffAttrs: { Aanvallen: ri(1, 20), Verdedigen: ri(1, 20), Tactisch: ri(1, 20), Technisch: ri(1, 20), Man_management: ri(1, 20), Motiveren: ri(1, 20), Oordeel_vermogen: ri(1, 20), Oordeel_potentie: ri(1, 20) },
  };
}

const data = {
  meta: { generated: new Date().toISOString(), gameDate: '2026-07-11', manager: 'mavarobli', myClub: 'Feyenoord', myClubRep: 7200, currency: 'GBP', source: 'TESTDATA' },
  players: Array.from({ length: 45000 }, (_, i) => player(i + 1)),
  staff: Array.from({ length: 8000 }, (_, i) => staff(100000 + i)),
};

const out = path.join(OUT, 'dump-test.json');
fs.writeFileSync(out, JSON.stringify(data));
console.log('Geschreven:', out, Math.round(fs.statSync(out).size / 1e6) + ' MB');
