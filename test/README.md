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
terug. Zo testen we de echte code, niet een kopie - een modelwijziging die de tests breekt, valt
meteen op.

## Waardemodel herijken

De automatische ijkset (`value-history.json`) is verwijderd (15-07) omdat de echte waarde nu
rechtstreeks uit het geheugen komt en het schatmodel on point is. Moet het schatmodel ooit
opnieuw geijkt worden, zet het verzamelen dan tijdelijk terug in `app/server.js` (zie de
git-historie van `archiveValues`). De huidige tests toetsen *invarianten* (waarde daalt niet
bij meer reputatie, potentie blijft ≤ 20, enz.).
