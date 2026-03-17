# Outreach Automation — SOP

## Syfte
Skicka automatiserade mejlsekvenser till 87 svenska estetiska kliniker. Max 20 mejl/dag. 4 steg per lead under 7 dagar.

## Förutsättningar

### .env
```
FROM_EMAIL=mathias@bahkobyra.se    # Avsändaradress
FROM_NAME=Mathias Bahko
SMTP_PASSWORD=ditt-lösenord        # one.com SMTP-lösenord
MAX_PER_DAY=20                     # Valfritt, standard 20
LOOM_URL=https://loom.com/share/xxxx  # Valfritt: Loom-video läggs in i Steg 1
```

### Setup Resend (en gång)
1. Gå till [resend.com](https://resend.com) och skapa gratis konto
2. Gå till API Keys → Create API Key → kopiera
3. Lägg till `RESEND_API_KEY=...` i `.env`
4. Verifiera din domän under Domains → Add Domain → följ DNS-instruktionerna
5. Testa med `--dry-run` innan första riktiga körning

## Sekvens

| Steg | Dag | Ämne | Fokus |
|------|-----|------|-------|
| 1 | 0 | Har [Klinik] tänkt på detta? | Intro + demo-länk |
| 2 | 3 | Såg ni mitt förslag? | Uppföljning + demo |
| 3 | 5 | Kliniker som bytte — resultaten | Social proof |
| 4 | 7 | Sista mejlet från mig | Sista CTA |

## Kommandon

```bash
# Simulera utan att skicka (alltid kör detta först)
node tools/outreach_manager.js --dry-run

# Kör faktiska utskick
node tools/outreach_manager.js

# Visa statistik
node tools/outreach_manager.js --status

# Markera lead som svarat (stoppar sekvensen)
node tools/outreach_manager.js --mark-replied=5

# Avregistrera lead (stoppar sekvensen permanent)
node tools/outreach_manager.js --unsubscribe=12

# Återställ lead till start
node tools/outreach_manager.js --reset=3
```

## Daglig rutin

1. Öppna terminal i projektmappen
2. Kör `node tools/outreach_manager.js --status` för att se läget
3. Kör `node tools/outreach_manager.js` för att skicka dagens mejl
4. Öppna CRM (`kliniker/crm.html`) och uppdatera status för leads som svarat

## State-fil

`.tmp/outreach_state.json` — spårar varje lead:
```json
{
  "1": {
    "lastStepSent": 2,
    "lastSentDate": "2026-03-16",
    "step1Date": "2026-03-16",
    "step2Date": "2026-03-19"
  },
  "5": { "replied": true },
  "12": { "unsubscribed": true }
}
```

## Data-filer

- `data/leads.json` — 87 leads (id, namn, email, webbplats, stad)
- `.tmp/outreach_state.json` — automation state (auto-skapad)

## Felsökning

| Fel | Lösning |
|-----|---------|
| `RESEND_API_KEY saknas` | Lägg till i `.env` |
| `Domänen ej verifierad` | Verifiera domänen i Resend-dashboarden |
| `402 Krediter slut` | Gratistier: 3000/mån. Uppgradera eller vänta |
| `Daglig gräns nådd` | Automatiskt stopp vid 20/dag. Kör igen imorgon |

## GDPR / Opt-out

- Alla svar med "avregistrera", "unsubscribe" eller "ta bort mig" hanteras manuellt
- Kör `node tools/outreach_manager.js --unsubscribe=ID` för att stoppa sekvensen
- State-filen fungerar som opt-out-register

## Nästa steg

- Koppla Resend webhooks → auto-uppdatera CRM vid svar
- A/B-testa ämnesrader
- Lägg till `--start-from=ID` för att börja vid specifikt lead
