# Workflow: Lead Enrichment

## Syfte
Hitta beslutfattares personliga e-postadresser för leads som har generiska adresser
(info@, kontakt@, etc.) så att outreach-kampanjer kan personaliseras till rätt person.

## Förutsättningar
`.env` måste innehålla:
```
APOLLO_API_KEY=...       # apollo.io API-nyckel
FIRECRAWL_API_KEY=...    # firecrawl.dev API-nyckel (redan inlagt)
```

## Innan du kör — Poängsätt mejlmallarna
Kör email-scorern för att säkra att mallarna håller hög kvalitet:
```bash
node tools/score_email.js
```
Granska feedbacken och uppdatera mallarna i `outreach_manager.js` vid behov.

## Steg 1 — Kolla status (om enrichment körts tidigare)
```bash
node tools/enrich_leads.js --status
```

## Steg 2 — Testa med ett lead
```bash
node tools/enrich_leads.js --id=1
```
Kontrollera att `data/leads_enriched.json` skapas med rätt format.

## Steg 3 — Kör full enrichment
```bash
node tools/enrich_leads.js
```

Processen:
1. Hämtar beslutfattare via Apollo.io (VD, ägare, klinikchef, etc.)
2. Om Apollo inte har en avslöjad e-post → skrapar klinikens webbplats via Firecrawl
3. Sparar alla resultat i `data/leads_enriched.json` efter varje lead (crash-safe)
4. Original `data/leads.json` ändras ALDRIG

Förväntad tid: ~3-5 minuter för 82 leads (rate limiting).

## Steg 4 — Granska resultaten
```bash
node tools/enrich_leads.js --status
```

Typiska resultat:
- Apollo: 30-40% av leads (de med aktiva LinkedIn-profiler i Apollo-databasen)
- Firecrawl: 10-20% ytterligare (kliniker som listar personlig kontakt på webbplatsen)
- Ej hittad: 40-60% — dessa får fortfarande info@-adressen

## Steg 5 — Starta outreach
```bash
node tools/outreach_manager.js --dry-run
node tools/outreach_manager.js
```
outreach_manager läser automatiskt `leads_enriched.json` om den finns och använder
den berikade e-postadressen (hög/medium konfidenz) för respektive lead.

## Återuppta avbruten enrichment
Om scriptet avbryts kan du fortsätta från ett specifikt ID:
```bash
node tools/enrich_leads.js --from-id=35
```
Redan berikade leads hoppas automatiskt över.

## Felhantering
| Fel | Åtgärd |
|-----|--------|
| `APOLLO_API_KEY saknas` | Lägg till nyckeln i `.env` |
| Apollo 401 Unauthorized | Kontrollera att API-nyckeln är korrekt |
| Apollo 429 Rate limit | Scriptet väntar 10s automatiskt; kör om vid behov |
| Firecrawl 402/403 | Kontrollera krediter på firecrawl.dev/dashboard |
| `leads_enriched.json corrupt` | Ta bort filen och kör enrichment från start |

## Apollo Free Tier-gränser
- ~300 people searches/månad
- 82 leads = 82 searches = ryms bekvämt inom gratistjärsen
- Emails kräver "export credits" — ej alla kommer ha avslöjad e-post

## Filer
| Fil | Beskrivning |
|-----|-------------|
| `data/leads.json` | Originaldatan — ändras ALDRIG |
| `data/leads_enriched.json` | Berikad data med beslutfattarinfo |
| `.tmp/enrichment_report.json` | Statistik från senaste körning |
