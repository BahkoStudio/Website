# Workflow: Konkurrensanalys

## Syfte
Automatisera research av konkurrenter på den svenska digitala byråmarknaden.
Output: En branded HTML-rapport med marknadsöversikt, priser, positionering och möjligheter.

## Krav (innan du kör)
- `.env` innehåller `PERPLEXITY_API_KEY` (gå till perplexity.ai/settings/api)
- `brand/brand.json` är ifylld med ditt företagsnamn, färger och tjänster
- Python 3.8+ installerat
- `requests`-biblioteket installerat: `pip install requests`

## Inputs
| Input | Var | Beskrivning |
|-------|-----|-------------|
| API-nyckel | `.env` | Perplexity API-nyckel |
| Varumärke | `brand/brand.json` | Företagsinfo, färger, logo |
| Logo (valfri) | `brand/logo.png` | Visas i rapport-headern |

## Steg

### 1. Research (3-5 minuter)
```
python tools/competitor_research.py
```
Gör 5 Perplexity-sökningar och sparar rå data till `.tmp/research_raw.json`.

**Vad söks:**
1. Marknadsöversikt — de 10 främsta byråerna
2. Prisanalys — vad kostar hemsidor, SEO, ads i Sverige
3. Klinik-nischen — byråer som fokuserar på kliniker/skönhet
4. Positionering & gaps — vad saknar kunderna
5. Möjligheter — hur ta marknadsandelar

### 2. Generera rapport
```
python tools/generate_report.py
```
Läser `.tmp/research_raw.json` + `brand/brand.json`, genererar branded HTML,
sparar till `.tmp/competitor_report_DATUM.html` och öppnar i browser.

## Output
- **Fil**: `.tmp/competitor_report_DATUM.html`
- **Öppnas automatiskt** i default browser
- **Sektioner**: Marknadsöversikt · Prisanalys · Klinik-nischen · Positionering · Möjligheter

## Hur ofta köra
- **Månatlig analys** — kör en gång per månad för att hålla koll på marknaden
- **Före säljmöte** — kör dagen innan för aktuell data om en specifik konkurrent
- **Vid nylansering** — kör för att hitta rätt positionering

## Feltolkning

| Fel | Lösning |
|-----|---------|
| `Ingen Perplexity API-nyckel` | Öppna `.env`, fyll i `PERPLEXITY_API_KEY` |
| `HTTP 401` | API-nyckeln är ogiltig — skapa en ny på perplexity.ai |
| `HTTP 429` | Rate limit — vänta 1 minut och kör igen |
| `ModuleNotFoundError: requests` | Kör `pip install requests` |
| Ingen logo visas | Lägg in `brand/logo.png` eller lämna tomt (visar företagsnamn) |

## Anpassa rapporten
- **Byt språk på frågor**: Redigera `queries`-listan i `tools/competitor_research.py`
- **Lägg till sektion**: Lägg till en ny dict i `build_queries()` och ett nytt `section_icons`-entry
- **Byt färger**: Redigera `brand/brand.json` (primary_color, secondary_color)
- **Byt font**: Ändra `font_heading` och `font_body` i brand.json (Google Fonts-namn)

## Lärda läxor
*(Uppdatera när du hittar quirks eller begränsningar)*
- Perplexity `sonar`-modellen är bra för research, `sonar-pro` ger mer detaljerade svar (kostar mer)
- `search_recency_filter: "month"` ger färsk data — ta bort för bredare historisk research
- Rapport-filen öppnas inte automatiskt på Linux — kör `xdg-open .tmp/competitor_report_*.html`
