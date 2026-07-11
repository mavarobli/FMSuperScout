// Genereert een fake dump om de UI mee te testen (wordt later vervangen door echte plugindata).
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUT = path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout');
fs.mkdirSync(OUT, { recursive: true });

const FIRST = ['Jari', 'Sem', 'Luuk', 'Milan', 'Kees', 'Diego', 'Luca', 'Marco', 'Pedro', 'João', 'Kylian', 'Erling', 'Youri', 'Sven', 'Tijs', 'Bram', 'Nico', 'Rafa', 'Andri', 'Tom'];
const LAST = ['Jansen', 'de Vries', 'van Dijk', 'Silva', 'Santos', 'Müller', 'García', 'Rossi', 'Kowalski', 'Eriksen', 'Berg', 'Timber', 'Botman', 'Nielsen', 'Costa', 'Moreno', 'Novak', 'Petrov', 'Yilmaz', 'Karlsson'];
const CLUBS = ['Feyenoord', 'Ajax', 'PSV', 'AZ', 'FC Twente', 'Real Madrid', 'Barcelona', 'Bayern', 'Dortmund', 'Liverpool', 'Arsenal', 'Chelsea', 'Inter', 'Milan', 'PSG', 'Benfica', 'Porto', 'Club Brugge', 'Anderlecht', 'Celtic', null];
const DIVS = ['Eredivisie', 'La Liga', 'Bundesliga', 'Premier League', 'Serie A', 'Ligue 1', 'Liga Portugal', 'Pro League', 'Premiership'];
const NATS = ['NED', 'BEL', 'GER', 'ESP', 'FRA', 'ENG', 'ITA', 'POR', 'BRA', 'ARG', 'DEN', 'SWE', 'NOR', 'TUR', 'POL', 'CRO'];
const POS_SETS = [['GK'], ['DC'], ['DC', 'DR'], ['DL', 'WBL'], ['DM', 'MC'], ['MC'], ['MC', 'AMC'], ['AMR', 'ST'], ['AML'], ['ST'], ['AMC', 'ST'], ['DR', 'WBR', 'MR']];
const JOBS = ['Assistent-manager', 'Coach', 'Fitnesscoach', 'Keeperstrainer', 'Scout', 'Fysiotherapeut', 'Hoofd jeugdopleiding', 'Directeur voetbalzaken', 'Data-analist'];
const TECH = ['Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'FreeKicks', 'Heading', 'LongShots', 'LongThrows', 'Marking', 'Passing', 'PenaltyTaking', 'Tackling', 'Technique'];
const MENT = ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'];
const PHYS = ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength'];
const GK = ['AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'Handling', 'Kicking', 'OneOnOnes', 'Punching', 'Reflexes', 'RushingOut', 'Throwing'];

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[ri(0, a.length - 1)];

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
  const value = Math.round(Math.pow(ca / 30, 4) * (age < 24 ? 2.2 : age > 30 ? 0.5 : 1) * 1000);
  return {
    id, name: pick(FIRST) + ' ' + pick(LAST),
    age, dob: `${2026 - age}-0${ri(1, 9)}-1${ri(0, 9)}`,
    nat: [pick(NATS)],
    club, div: club ? pick(DIVS) : null,
    pos: posArr.join(', '), posArr,
    foot: pick(['Links', 'Rechts', 'Beide']),
    height: ri(165, 200),
    ca, pa,
    value, askingPrice: club ? Math.round(value * (1 + Math.random())) : 0,
    wage: club ? ri(500, 400000) : 0,
    wageDemand: ri(1000, 450000),
    expires: club ? `${ri(2026, 2031)}-06-30` : null,
    interested: Math.random() < 0.15,
    listed: Math.random() < 0.06,
    loanListed: Math.random() < 0.08,
    persona: pick(['Gedreven', 'Professioneel', 'Evenwichtig', 'Ambitieus', 'Loyaal', 'Temperamentvol']),
    attrs,
  };
}

function staff(id) {
  const ca = ri(40, 195), pa = Math.min(200, ca + ri(0, 30));
  const age = ri(28, 68);
  const club = pick(CLUBS);
  return {
    id, name: pick(FIRST) + ' ' + pick(LAST),
    age, nat: [pick(NATS)], club, job: pick(JOBS),
    ca, pa,
    wage: club ? ri(300, 80000) : 0,
    expires: club ? `${ri(2026, 2030)}-06-30` : null,
    staffAttrs: { Aanvallen: ri(1, 20), Verdedigen: ri(1, 20), Tactisch: ri(1, 20), Technisch: ri(1, 20), Mentaal: ri(1, 20), Fitheid: ri(1, 20), Keepers: ri(1, 20), Jeugd: ri(1, 20), Motiveren: ri(1, 20), Discipline: ri(1, 20), 'Man-management': ri(1, 20), Oordeel_huidig: ri(1, 20), Oordeel_potentie: ri(1, 20) },
  };
}

const data = {
  meta: { generated: new Date().toISOString(), gameDate: '2026-07-11', myClub: 'Feyenoord', source: 'TESTDATA' },
  players: Array.from({ length: 45000 }, (_, i) => player(i + 1)),
  staff: Array.from({ length: 8000 }, (_, i) => staff(100000 + i)),
};

const out = path.join(OUT, 'dump-test.json');
fs.writeFileSync(out, JSON.stringify(data));
console.log('Geschreven:', out, Math.round(fs.statSync(out).size / 1e6) + ' MB');
