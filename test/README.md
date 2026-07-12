# Tests

Zero-dependency modeltests (`node:test`) voor de reken-functies in `app/app.js`:
waardeschatting, vraagprijs, interesse, potentie-projectie en rolscore.

```bash
npm test        # of: node --test test/*.test.js
```

## Hoe het werkt

`app/app.js` is één klassiek browser-script vol DOM-bediening, dus het is geen module die je
zomaar kunt `require`-en. `harness.js` voert de échte broncode uit in een functie-scope met
neppe (no-op) globals (`document`, `localStorage`, `fetch`, …) en geeft daarna de reken-functies
terug. Zo testen we de echte code, niet een kopie — een modelwijziging die de tests breekt, valt
meteen op.

## Nieuwe ijkpunten toevoegen (waardemodel)

De server bewaart bij elke geladen dump automatisch de spelers met een échte in-game waarde in
`%LOCALAPPDATA%\FMSuperScout\value-history.json` (zie `app/server.js`). Wil je het waardemodel
herijken of er een regressietest van maken: haal die set op via `GET /api/value-history?full=1`
en leg een representatieve steekproef vast als fixture in deze map. De huidige tests toetsen
vooral *invarianten* (waarde daalt niet bij meer reputatie, potentie blijft ≤ 20, enz.); met
echte ijkpunten kun je daar exacte mediaanfout-grenzen aan toevoegen.
