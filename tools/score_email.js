#!/usr/bin/env node
/**
 * score_email.js — Bahko Byrå Email Quality Scorer
 *
 * Uses Perplexity AI to score cold email templates against the SM+CA 2.0 rubric.
 * Run this BEFORE launching outreach campaigns to validate email quality.
 *
 * Scoring criteria (cold email):
 *   - Subject Line + Opening Hook (35%)
 *   - Relevance to Persona & Pain Points (20%)
 *   - Clarity of Offer & Benefit (15%)
 *   - Emotional/Psychological Leverage (10%)
 *   - CTA Strength (15%)
 *   - Tone, Grammar, Professionalism (5%)
 *
 * Usage:
 *   node tools/score_email.js            # Score all 4 email steps
 *   node tools/score_email.js --step=1   # Score a specific step
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── LOAD .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#') && v.length) process.env[k.trim()] ??= v.join('=').trim();
  });
}
loadEnv();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const DEMO_URL           = process.env.DEMO_URL || 'https://bahkobyra.se/kliniker/elara-klinik-demo-v2.html';

// ── EMAIL TEMPLATES (plain text versions for scoring) ─────────────────────
// Using a sample clinic for context
const SAMPLE = { namn: 'Nordiska Kliniken', stad: 'Stockholm', webbplats: 'nordiskakliniken.se' };

const EMAILS = [
  {
    step: 1,
    label: 'Initialt utskick (Dag 0)',
    subject: `Har ${SAMPLE.namn} tänkt på detta?`,
    body: `Hej,

Jag heter Mathias Bahko och driver Bahko Byrå — en digital byrå som specialiserat sig på att hjälpa kliniker i Sverige att synas och attrahera fler patienter online.

Jag tittade på er nuvarande webbplats (${SAMPLE.webbplats}) och hade ett par tankar om hur den kan förbättras för att konvertera fler besökare till bokningar.

Jag har tagit fram ett kostnadsfritt demo som visar exakt hur ${SAMPLE.namn}s nya hemsida skulle kunna se ut — med snabbare laddtid, mobilanpassad design och en tydlig bokningsfunktion.

Se ditt demo → ${DEMO_URL}

Det tar under 2 minuter att titta på. Inga förpliktelser.

Är ni öppna för att ta en snabb koll?

Med vänliga hälsningar,
Mathias Bahko
Bahko Byrå · Synlighet som säljer.`
  },
  {
    step: 2,
    label: 'Uppföljning 1 (Dag 3)',
    subject: `Såg ni mitt förslag, ${SAMPLE.namn}?`,
    body: `Hej igen,

Jag skickade ett mejl häromdagen om ett kostnadsfritt demo vi tagit fram för kliniker i ${SAMPLE.stad}.

Ville bara följa upp för att säkra att ni fick det — och om ni har 2 minuter är det verkligen värt att se.

Se demot → ${DEMO_URL}

Vi jobbar för tillfället med ett fåtal kliniker i Sverige och vill säkerställa att ${SAMPLE.namn} inte missar möjligheten.

Med vänliga hälsningar,
Mathias Bahko
Bahko Byrå · Synlighet som säljer.`
  },
  {
    step: 3,
    label: 'Uppföljning 2 (Dag 5)',
    subject: `Kliniker som bytte hemsida — resultaten`,
    body: `Hej,

Kliniker som investerar i en professionell, konverteringsoptimerad hemsida ser i genomsnitt:
- Fler spontana bokningsförfrågningar via hemsidan
- Bättre ranking på Google för lokala sökningar
- Tydligare professionellt intryck som motiverar högre priser

Vi har tagit fram ett skräddarsytt demo specifikt för ${SAMPLE.namn}. Det visar hur er närvaro online kan transformeras.

Se ${SAMPLE.namn}s demo → ${DEMO_URL}

Svarar ni i dag bjuder vi på en kostnadsfri 30-minutersgenomgång.

Med vänliga hälsningar,
Mathias Bahko
Bahko Byrå · Synlighet som säljer.`
  },
  {
    step: 4,
    label: 'Sista uppföljningen (Dag 7)',
    subject: `Sista mejlet från mig, ${SAMPLE.namn}`,
    body: `Hej,

Det här är mitt sista mejl — vill inte vara påträngande.

Om ni någon gång undrar vad en modern klinikhemsida kan göra för er, vet ni var ni hittar oss.

Svara bara "ja" på det här mejlet så bokar jag ett kostnadsfritt 20-minuterssamtal.

Demot finns kvar → ${DEMO_URL}

Önskar ${SAMPLE.namn} all lycka framöver!

Med vänliga hälsningar,
Mathias Bahko
Bahko Byrå · Synlighet som säljer.`
  }
];

// ── SCORING PROMPT (from SM+CA 2.0 Outreach AI Prompts) ──────────────────
function buildPrompt(email) {
  return `You are a world-class sales consultant and marketer with deep experience in digital services and online marketing. You understand how to create cold outreach that speaks to real pain points like lack of traffic, low conversions, or stagnant lead pipelines.

Review the cold outreach email below. This message is meant for cold prospects — Swedish aesthetic/plastic surgery clinic owners and managers — at the very beginning of the sales cycle. The agency (Bahko Byrå) sells websites, Google Ads, SEO, and video production for Swedish clinics.

The goal of this message is to secure a simple, positive reply from the recipient that commits to either:
- Option A: Viewing a free demo website (2-minute commitment)
- Option B: Agreeing to a short 20-minute call

Score from 1–10 based on these criteria. Then explain clearly how the message performs in each area, what it does well, and what needs improvement.

SCORING BREAKDOWN:
- Subject Line + Opening Hook (35%) – Does it earn attention fast? Is it relevant, unexpected, or curiosity-inducing?
- Relevance to Persona & Pain Points (20%) – Does it speak to a real, specific problem or tension the target is likely facing?
- Clarity of Offer & Benefit (15%) – Can the reader immediately understand what's in it for them and why it matters now?
- Emotional/Psychological Leverage (10%) – Does it create urgency, tension, or curiosity without being manipulative or fluffy?
- CTA Strength (15%) – Is there a clear next step? Does it feel natural, low-friction, and worth taking?
- Tone, Grammar, and Professionalism (5%) – Is the message clean, typo-free, and confidence-inducing without being stiff or overly formal?

Finally, tell me this: If you were a busy Swedish clinic owner receiving this email, would this message earn your attention? Would you take either one of the intended next steps — even just clicking the link? Or would you delete it?

Be honest, punchy, and tactical in your feedback. List 2-4 actionable improvements.

---
SUBJECT: ${email.subject}

${email.body}
---

Respond in this exact format:
OVERALL SCORE: X/10

SUBJECT LINE + OPENING HOOK (35%): X/10
[Notes]

RELEVANCE TO PERSONA (20%): X/10
[Notes]

CLARITY OF OFFER (15%): X/10
[Notes]

EMOTIONAL LEVERAGE (10%): X/10
[Notes]

CTA STRENGTH (15%): X/10
[Notes]

TONE & PROFESSIONALISM (5%): X/10
[Notes]

VERDICT:
[1-2 sentences: would a busy clinic owner reply?]

TOP IMPROVEMENTS:
1. [improvement]
2. [improvement]
3. [improvement]`;
}

// ── PERPLEXITY API ─────────────────────────────────────────────────────────
async function scoreWithPerplexity(prompt) {
  if (!PERPLEXITY_API_KEY) {
    console.error('✗ PERPLEXITY_API_KEY saknas i .env');
    process.exit(1);
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  const args    = process.argv.slice(2);
  const stepArg = parseInt(args.find(a => a.startsWith('--step='))?.split('=')[1] || '0', 10);

  const toScore = stepArg
    ? EMAILS.filter(e => e.step === stepArg)
    : EMAILS;

  if (toScore.length === 0) {
    console.error(`Steg ${stepArg} hittades inte. Välj 1–4.`);
    process.exit(1);
  }

  console.log('\n📊 Bahko Byrå — Email Quality Scorer');
  console.log('   Baserat på SM+CA 2.0 Outreach AI Prompts');
  console.log('═══════════════════════════════════════════\n');

  for (const email of toScore) {
    console.log(`\n▶ Steg ${email.step}: ${email.label}`);
    console.log(`  Ämne: "${email.subject}"`);
    console.log('  Analyserar...\n');

    try {
      const result = await scoreWithPerplexity(buildPrompt(email));
      console.log(result);
      console.log('\n───────────────────────────────────────────\n');
    } catch (e) {
      console.error(`  ✗ Fel: ${e.message}`);
    }

    // Delay between requests
    if (toScore.length > 1) await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
